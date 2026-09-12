import { useState, useEffect, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { supabase, getProfile, Profile } from "@/lib/supabase";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // This function returns synchronously (no async/await) so it is safe to
    // call from the onAuthStateChange callback, which runs inside the SDK's
    // internal lock context. Awaiting a supabase call there would deadlock
    // and leave `loading` stuck (page keeps redirecting to home).
    const applyUser = (u: User | null) => {
      if (!mounted) return;
      setUser(u);
      if (!u) {
        setProfile(null);
        setLoading(false);
        return;
      }
      getProfile(u.id)
        .then((p) => {
          if (!mounted) return;
          setProfile(p);
          setLoading(false);
        })
        .catch(() => {
          if (!mounted) return;
          setProfile(null);
          setLoading(false);
        });
    };

    // Initial session load
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        applyUser(data?.session?.user ?? null);
      })
      .catch(async () => {
        // Phiên đăng nhập trong máy đã hết hạn hoặc không còn hợp lệ (ví dụ
        // tài khoản bị đổi mật khẩu / xóa rồi tạo lại). Backend trả về lỗi
        // "Invalid Refresh Token" khi cố làm mới phiên. Ta chủ động xóa sạch
        // phiên cũ ở máy để tránh lỗi này lặp lại mãi, rồi đưa người dùng về
        // trạng thái chưa đăng nhập để họ đăng nhập lại cho sạch sẽ.
        try {
          await supabase.auth.signOut({ scope: "local" });
        } catch {
          // Bỏ qua nếu không xóa được phiên — không ảnh hưởng tới luồng chính.
        }
        if (mounted) {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      });

    // Auth state changes — callback must return synchronously
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      applyUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const p = await getProfile(user.id);
    setProfile(p);
  }, [user]);

  const isAdmin = profile?.role === "admin";

  return { user, profile, isAdmin, loading, refreshProfile };
}