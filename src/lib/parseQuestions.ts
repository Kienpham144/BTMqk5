// Parser for importing quiz questions from Word (.docx) files.
// Supports four layouts from the SAME file, tried in order:
//   1. Table: each row = one question with columns:
//        câu hỏi | đáp án A | đáp án B | đáp án C | đáp án D | đáp án đúng | giải thích
//   2. Pipe/tab separated text: each line = one question
//        câu hỏi | A | B | C | D | <đáp án đúng A/B/C/D> | giải thích
//   3. Standard Vietnamese multiple-choice text (most common .docx):
//        Câu 1.
//        <question text>
//        A. option
//        B. option
//        C. option
//        D. option
//        Đáp án đúng: B. ...
//   4. Relaxed text scan (no "Câu N." marker needed): any block of
//      A./B./C./D. option lines preceded by a question line.
import mammoth from "mammoth";

export interface ParsedQuestion {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}

const ANSWER_LETTERS = ["A", "B", "C", "D", "E", "F"];

// Parse a CSV/TSV string into rows of cells (handles quotes, comma/semicolon/tab).
function parseDelimitedRows(text: string): string[][] {
  // Detect the delimiter from the first non-empty line.
  const firstLine = text.split(/\r?\n/).find((l) => l.trim()) ?? "";
  let delimiter = ",";
  if (firstLine.includes(";")) delimiter = ";";
  else if (firstLine.includes("\t")) delimiter = "\t";

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  const pushCell = () => {
    row.push(cell);
    cell = "";
  };
  const pushRow = () => {
    pushCell();
    if (row.some((c) => c.trim() !== "")) rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      pushCell();
    } else if (ch === "\n") {
      pushRow();
    } else if (ch === "\r") {
      // ignore, handled by \n
    } else {
      cell += ch;
    }
  }
  pushRow();
  return rows;
}

// Parse CSV/TSV questions. Expected columns:
//   câu hỏi | đáp án A | đáp án B | đáp án C | đáp án D | đáp án đúng | giải thích
// A header row is auto-detected and skipped.
export function parseCsvQuestions(text: string): ParsedQuestion[] {
  const rows = parseDelimitedRows(text);
  const questions: ParsedQuestion[] = [];

  for (const row of rows) {
    const normalized = row.map(norm);
    // Skip header row if present.
    if (normalized.some((c) => /câu hỏi|đáp án|giải thích/i.test(c)) && !normalized[0]) {
      continue;
    }
    const question = normalized[0];
    if (!question) continue;
    // Skip header row if the first cell itself is a label.
    if (/câu hỏi|giải thích|đáp án/i.test(question)) continue;
    const options = normalized.slice(1, Math.min(5, normalized.length)).filter((c) => c);
    if (options.length < 2) continue;
    const answerCell = normalized[5] ?? "";
    const answerIndex = detectAnswerIndex(answerCell);
    if (answerIndex < 0 || answerIndex >= options.length) continue;
    questions.push({
      question,
      options,
      answer: answerIndex,
      explanation: normalized[6] ?? "",
    });
  }

  return questions;
}

function norm(value: string): string {
  // Normalize Unicode (NFC) so combining Vietnamese diacritics are recomposed.
  return value.normalize("NFC").replace(/\s+/g, " ").trim();
}

function detectAnswerIndex(value: string): number {
  const v = norm(value).toUpperCase();
  if (!v) return -1;
  const letterMatch = v.match(/[A-F]/);
  if (letterMatch) {
    const idx = ANSWER_LETTERS.indexOf(letterMatch[0]);
    if (idx >= 0) return idx;
  }
  const num = parseInt(v.replace(/[^0-9]/g, ""), 10);
  if (!Number.isNaN(num)) {
    return num >= 1 ? num - 1 : num;
  }
  return -1;
}

function textToQuestion(cells: string[]): ParsedQuestion | null {
  if (cells.length < 3) return null;
  const question = norm(cells[0]);
  if (!question) return null;

  const normalized = cells.map(norm);
  const options: string[] = [];
  normalized.slice(1, Math.min(5, normalized.length)).forEach((c) => {
    if (c) options.push(c);
  });

  const answerCell = normalized[5] ?? "";
  const explanationCell = normalized[6] ?? "";
  const answerIndex = detectAnswerIndex(answerCell);
  if (options.length < 2) return null;
  if (answerIndex < 0 || answerIndex >= options.length) return null;

  return { question, options, answer: answerIndex, explanation: explanationCell };
}

// Parse the classic Vietnamese multiple-choice text format.
function parseVietnameseFormat(rawText: string): ParsedQuestion[] {
  const lines = rawText.split(/\r?\n/).map((l) => norm(l));
  const questions: ParsedQuestion[] = [];
  const questionRegex = /^(?:c[âa]u(?:\s*h[ỏo]i)?|b[àa]i)\s*[:.]?\s*(\d+)\s*[.:)]?\s*(.*)$/i;
  const optionRegex = /^([A-Fa-f])\s*[.)\-\/\s:]\s*(.+)$/;
  const answerRegex = /^[ĐD]áp\s*[áa]n(?:\s*[đd]úng)?(?:\s*là)?\s*[.:]?\s*(.+)$/i;

  let hasCurrent = false;
  let question = "";
  let options: string[] = [];
  let answerIndex = -1;
  let explanation = "";

  const flush = () => {
    if (
      hasCurrent &&
      question &&
      options.length >= 2 &&
      answerIndex >= 0 &&
      answerIndex < options.length
    ) {
      questions.push({ question, options, answer: answerIndex, explanation });
    }
  };

  for (const line of lines) {
    if (!line) continue;

    const qMatch = line.match(questionRegex);
    if (qMatch) {
      flush();
      hasCurrent = true;
      question = norm(qMatch[2]);
      options = [];
      answerIndex = -1;
      explanation = "";
      continue;
    }

    if (!hasCurrent) continue;

    const aMatch = line.match(answerRegex);
    if (aMatch) {
      answerIndex = detectAnswerIndex(aMatch[1]);
      continue;
    }

    const optMatch = line.match(optionRegex);
    if (optMatch && answerIndex < 0 && options.length < ANSWER_LETTERS.length) {
      options.push(norm(optMatch[2]));
      continue;
    }

    if (!question) {
      question = norm(line);
    } else if (answerIndex < 0) {
      question = `${question} ${norm(line)}`;
    } else {
      explanation = `${explanation} ${norm(line)}`.trim();
    }
  }
  flush();
  return questions;
}

// Relaxed scan: find "A./B./C./D." option groups. No "Câu N." marker required.
function parseRelaxedFormat(rawText: string): ParsedQuestion[] {
  const lines = rawText.split(/\r?\n/).map((l) => norm(l));
  const optionRegex = /^([A-Fa-f])\s*[.)\-\/\s:]\s*(.+)$/;
  const answerRegex = /^[ĐD]áp\s*[áa]n(?:\s*[đd]úng)?(?:\s*là)?\s*[.:]?\s*(.+)$/i;

  const questions: ParsedQuestion[] = [];
  let pendingQuestion = "";
  let options: string[] = [];
  let answerIndex = -1;
  let explanation = "";

  const flush = () => {
    if (
      pendingQuestion &&
      options.length >= 2 &&
      answerIndex >= 0 &&
      answerIndex < options.length
    ) {
      questions.push({
        question: pendingQuestion,
        options,
        answer: answerIndex,
        explanation,
      });
    }
    pendingQuestion = "";
    options = [];
    answerIndex = -1;
    explanation = "";
  };

  for (const line of lines) {
    if (!line) continue;

    const aMatch = line.match(answerRegex);
    const optMatch = line.match(optionRegex);

    if (aMatch) {
      answerIndex = detectAnswerIndex(aMatch[1]);
      continue;
    }

    if (optMatch && options.length < ANSWER_LETTERS.length) {
      // Switch to a new group when we already have options pending and a new
      // option block begins from scratch (e.g. reset when question ended).
      const letterIdx = ANSWER_LETTERS.indexOf(optMatch[1].toUpperCase());
      if (options.length > 0 && letterIdx === 0) {
        flush();
      }
      options.push(norm(optMatch[2]));
      continue;
    }

    // Normal text line.
    if (options.length > 0) {
      // We already have options; if we finished one group and this is a new
      // question, flush.
      if (answerIndex >= 0) {
        // trailing content after the answer line → treat as explanation
        explanation = `${explanation} ${norm(line)}`.trim();
      } else {
        flush();
        pendingQuestion = norm(line);
      }
    } else {
      pendingQuestion = pendingQuestion
        ? `${pendingQuestion} ${norm(line)}`
        : norm(line);
    }
  }
  flush();
  return questions;
}

// Inline format: the whole question is written on a single line (or a wrapped
// paragraph) without line breaks between the question text, the options, and
// the answer. Example:
//   Câu 1. Nội dung câu hỏi? A. Đáp án A B. Đáp án B C. Đáp án C D. Đáp án D Đáp án: A
// This is common when pasting straight from a Word document that has one
// paragraph per question.
const INLINE_OPTION_SPLIT = /\s+(?=[A-D][.):]\s+)/;
const INLINE_OPTION_STRIP = /^[A-D][.):]\s+/;

function parseInlineBlock(block: string): ParsedQuestion | null {
  // Strip the leading "Câu N." marker.
  const marker = block.match(/^[Cc][âa]u\s*\d+\s*[.:)]\s*/);
  if (!marker) return null;
  const body = block.slice(marker[0].length).trim();
  if (!body) return null;

  // Extract the answer letter from "Đáp án: X".
  const answerMatch = body.match(/[ĐD]áp\s*[áa]n(?:\s*[đd]úng)?(?:\s*là)?\s*[.:]?\s*([A-Fa-f])\b/i);
  if (!answerMatch || answerMatch.index == null) return null;
  const answerIndex = ANSWER_LETTERS.indexOf(answerMatch[1].toUpperCase());
  if (answerIndex < 0) return null;

  const beforeAnswer = body.slice(0, answerMatch.index).trim();

  // Split question text from the option markers A./B./C./D. that follow it.
  const segments = beforeAnswer.split(INLINE_OPTION_SPLIT);
  const question = norm(segments[0]);
  const options = segments
    .slice(1)
    .map((s) => norm(s.replace(INLINE_OPTION_STRIP, "")))
    .filter((s) => s);

  if (!question || options.length < 2) return null;
  if (answerIndex >= options.length) return null;

  return { question, options, answer: answerIndex, explanation: "" };
}

function parseInlineFormat(rawText: string): ParsedQuestion[] {
  // Collapse all whitespace (including newlines) into single spaces so that a
  // wrapped paragraph is treated as one continuous line.
  const text = rawText.replace(/\s+/g, " ").trim();
  const questions: ParsedQuestion[] = [];

  const blockRegex = /[Cc][âa]u\s*\d+\s*[.:)]\s*/g;
  const starts: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = blockRegex.exec(text)) !== null) {
    starts.push(m.index);
  }

  for (let i = 0; i < starts.length; i++) {
    const block = text.slice(starts[i], i + 1 < starts.length ? starts[i + 1] : text.length);
    const parsed = parseInlineBlock(block);
    if (parsed) questions.push(parsed);
  }

  return questions;
}

export async function parseDocxQuestions(file: File): Promise<ParsedQuestion[]> {
  const arrayBuffer = await file.arrayBuffer();

  // Strategy 1: table layout.
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer });
  const doc = new DOMParser().parseFromString(html, "text/html");
  const questions: ParsedQuestion[] = [];

  const tables = Array.from(doc.querySelectorAll("table"));
  for (const table of tables) {
    const rows = Array.from(table.querySelectorAll("tr"));
    let headerSeen = false;
    for (const row of rows) {
      const cells = Array.from(row.querySelectorAll("td, th")).map((td) => td.textContent || "");
      if (!headerSeen && cells.some((c) => /câu hỏi|giải thích|đáp án/i.test(c))) {
        headerSeen = true;
        continue;
      }
      const parsed = textToQuestion(cells);
      if (parsed) questions.push(parsed);
    }
  }
  if (questions.length > 0) return questions;

  // Strategy 2: pipe/tab separated plain text.
  const { value: text } = await mammoth.extractRawText({ arrayBuffer });
  const pipedQuestions: ParsedQuestion[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = norm(line);
    if (!trimmed) continue;
    const parts = trimmed.split(/[|\t]+/).map((p) => p.trim());
    if (parts.length < 3) continue;
    const q = norm(parts[0]);
    if (!q) continue;
    const options = parts.slice(1, Math.min(5, parts.length)).filter((p) => p);
    if (options.length < 2) continue;
    const answer = detectAnswerIndex(parts[5] ?? "");
    if (answer < 0 || answer >= options.length) continue;
    pipedQuestions.push({
      question: q,
      options,
      answer,
      explanation: parts[6] ?? "",
    });
  }
  if (pipedQuestions.length > 0) return pipedQuestions;

  // Strategy 3: standard Vietnamese "Câu X / A B C D / Đáp án đúng" format.
  const vnQuestions = parseVietnameseFormat(text);
  if (vnQuestions.length > 0) return vnQuestions;

  // Strategy 4: inline format — question + options + answer on one line.
  const inlineQuestions = parseInlineFormat(text);
  if (inlineQuestions.length > 0) return inlineQuestions;

  // Strategy 5: relaxed scan fallback.
  const relaxed = parseRelaxedFormat(text);

  // Diagnostic logging (harmless in production, helps debugging import issues).
  // eslint-disable-next-line no-console
  console.info("[parseQuestions] raw text length:", text.length);
  // eslint-disable-next-line no-console
  console.info("[parseQuestions] raw text preview:", text.slice(0, 400));

  return relaxed;
}

export function parseTextQuestions(text: string): ParsedQuestion[] {
  const inlineQuestions = parseInlineFormat(text);
  if (inlineQuestions.length > 0) return inlineQuestions;

  const csvQuestions = parseCsvQuestions(text);
  if (csvQuestions.length > 0) return csvQuestions;

  const vnQuestions = parseVietnameseFormat(text);
  if (vnQuestions.length > 0) return vnQuestions;

  return parseRelaxedFormat(text);
}