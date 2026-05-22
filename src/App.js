import { useState, useMemo, useRef, useEffect } from "react";

const externalEngines = [
  { id: "google", label: "Google", color: "#4285F4", url: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}` },
  { id: "naver", label: "Naver", color: "#03C75A", url: (q) => `https://search.naver.com/search.naver?query=${encodeURIComponent(q)}` },
];

// ── 공유 데이터 파일 목록 (public/game_rule_data 안의 파일명을 여기에 추가)
const SHARED_FILES = [
  // 예시: "규칙.csv", "기획.md"
  // 실제 파일명으로 교체하세요
"d1.md",
"d2.md",
"d3.md",
"d4.md",
"d5.md",
"d6.md",
"d7.md",
"d8.md",
"d9.md",
"d10.md",
"d11.md",
"d12.md",
"d13.md",
"d14.md",
"d15.md",
"d16.md",
"d17.md"

];

function tokenize(str) {
  return str.trim().toLowerCase().split(/\s+/).filter(t => t.length >= 2);
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map(h => h.replace(/^"|"$/g, "").trim());
  const rows = lines.slice(1).map((line, idx) => {
    const cols = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { inQ = !inQ; }
      else if (c === "," && !inQ) { cols.push(cur); cur = ""; }
      else { cur += c; }
    }
    cols.push(cur);
    const obj = { _id: idx + 1, _type: "csv" };
    headers.forEach((h, i) => { obj[h] = (cols[i] || "").replace(/^"|"$/g, "").trim(); });
    return obj;
  });
  return { headers, rows };
}

function parseMD(text, filename) {
  const lines = text.split(/\r?\n/);
  const sections = [];
  let cur = null;
  lines.forEach(line => {
    const h1 = line.match(/^#\s+(.+)/);
    const h2 = line.match(/^##\s+(.+)/);
    const h3 = line.match(/^###\s+(.+)/);
    if (h1 || h2 || h3) {
      if (cur) sections.push(cur);
      cur = { title: (h1 || h2 || h3)[1].trim(), body: [] };
    } else {
      if (cur) cur.body.push(line);
      else cur = { title: filename, body: [line] };
    }
  });
  if (cur) sections.push(cur);
  return sections.filter(s => s.body.join("").trim() || s.title).map((s, i) => ({
    _id: i + 1, _type: "md", _file: filename,
    제목: s.title, 내용: s.body.join("\n").trim(),
  }));
}

function Highlight({ text, keyword }) {
  if (!keyword) return <span>{text}</span>;
  const tokens = tokenize(keyword);
  if (!tokens.length) return <span>{text}</span>;
  const safe = tokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const regex = new RegExp("(" + safe + ")", "gi");
  const parts = String(text).split(regex);
  return (
    <span>
      {parts.map((part, i) =>
        regex.test(part)
          ? <mark key={i} style={{ background: "rgba(99,102,241,0.4)", color: "#c7d2fe", borderRadius: 3, padding: "0 2px" }}>{part}</mark>
          : part
      )}
    </span>
  );
}

function EngineBtn({ active, color, onClick, label }) {
  return (
    <button onClick={onClick} style={{
      padding: "7px 18px", borderRadius: 20,
      border: "1.5px solid " + (active ? color : "rgba(255,255,255,0.1)"),
      background: active ? color + "22" : "transparent",
      color: active ? color : "rgba(160,160,200,0.45)",
      fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s"
    }}>{label}</button>
  );
}

function Divider({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ height: 1, flex: 1, background: "linear-gradient(90deg, rgba(99,102,241,0.5), transparent)" }} />
      <span style={{ fontSize: 12, color: "rgba(160,160,220,0.5)" }}>{label}</span>
      <div style={{ height: 1, flex: 1, background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.5))" }} />
    </div>
  );
}

function FilePage({ sharedFiles, userFiles, dragOver, setDragOver, loadUserFiles, removeUserFile, onDone, fileRef }) {
  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "44px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#f0f0ff" }}>데이터 파일 관리</div>
          <div style={{ fontSize: 12, color: "rgba(160,160,200,0.45)", marginTop: 3 }}>CSV · MD 파일을 관리하세요</div>
        </div>
        <button onClick={onDone} style={{
          padding: "8px 20px", borderRadius: 20,
          background: "linear-gradient(135deg, #6366f1, #a855f7)",
          border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer"
        }}>검색하러 가기 →</button>
      </div>

      {/* 공유 데이터 */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#a5b4fc", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
          <span>🌐</span> 공유 데이터 (모든 사용자 공통)
        </div>
        {sharedFiles.length === 0 ? (
          <div style={{ padding: "16px 18px", borderRadius: 12, background: "rgba(99,102,241,0.05)", border: "1px dashed rgba(99,102,241,0.2)", fontSize: 13, color: "rgba(140,140,180,0.4)", textAlign: "center" }}>
            public/game_rule_data 폴더에 파일을 넣고 SHARED_FILES 에 파일명을 추가하세요
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sharedFiles.map(f => (
              <div key={f.name} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "12px 16px", borderRadius: 12,
                background: f.type === "csv" ? "rgba(99,102,241,0.07)" : "rgba(168,85,247,0.07)",
                border: "1px solid " + (f.type === "csv" ? "rgba(99,102,241,0.2)" : "rgba(168,85,247,0.2)")
              }}>
                <span style={{ fontSize: 20 }}>{f.type === "csv" ? "📊" : "📝"}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: f.type === "csv" ? "#a5b4fc" : "#d8b4fe" }}>{f.name}</div>
                  <div style={{ fontSize: 11, color: "rgba(160,160,200,0.4)", marginTop: 1 }}>{f.rows.length}개 항목</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 구분선 */}
      <div style={{ height: 1, background: "rgba(99,102,241,0.15)", marginBottom: 28 }} />

      {/* 추가 업로드 */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(180,180,230,0.6)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
          <span>📤</span> 추가 파일 업로드 (현재 세션만)
        </div>
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); loadUserFiles(e.dataTransfer.files); }}
          onClick={() => fileRef.current.click()}
          style={{
            border: "2px dashed " + (dragOver ? "#6366f1" : "rgba(99,102,241,0.3)"),
            borderRadius: 14, padding: "28px 20px", textAlign: "center", cursor: "pointer",
            background: dragOver ? "rgba(99,102,241,0.1)" : "rgba(99,102,241,0.03)",
            transition: "all 0.2s", marginBottom: 16
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>📂</div>
          <div style={{ fontSize: 14, color: "rgba(180,180,230,0.6)", marginBottom: 4 }}>파일을 드래그하거나 클릭해서 업로드</div>
          <div style={{ fontSize: 11, color: "rgba(140,140,180,0.35)" }}>새로고침하면 사라져요 · CSV, MD 지원</div>
        </div>
        {userFiles.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {userFiles.map(f => (
              <div key={f.name} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 16px", borderRadius: 12,
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 20 }}>{f.type === "csv" ? "📊" : "📝"}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(200,200,230,0.7)" }}>{f.name}</div>
                    <div style={{ fontSize: 11, color: "rgba(160,160,200,0.35)", marginTop: 1 }}>{f.rows.length}개 항목</div>
                  </div>
                </div>
                <button onClick={() => removeUserFile(f.name)} style={{
                  padding: "4px 12px", borderRadius: 16,
                  background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)",
                  color: "rgba(252,165,165,0.7)", fontSize: 12, cursor: "pointer"
                }}>삭제</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("search");
  const [sharedFiles, setSharedFiles] = useState([]);
  const [userFiles, setUserFiles] = useState([]);
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [selectedEngine, setSelectedEngine] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  // 앱 시작 시 public/game_rule_data 에서 공유 파일 자동 로드
  useEffect(() => {
    if (SHARED_FILES.length === 0) return;
    Promise.all(
      SHARED_FILES.map(async (filename) => {
        const res = await fetch(process.env.PUBLIC_URL + "/game_rule_data/" + filename);
        if (!res.ok) return null;
        const text = await res.text();
        const ext = filename.split(".").pop().toLowerCase();
        if (ext === "csv") {
          const { headers, rows } = parseCSV(text);
          return { name: filename, type: "csv", headers, rows };
        } else {
          const rows = parseMD(text, filename.replace(".md", ""));
          return { name: filename, type: "md", headers: ["제목", "내용"], rows };
        }
      })
    ).then(results => setSharedFiles(results.filter(Boolean)));
  }, []);

  const loadUserFiles = (fileList) => {
    Array.from(fileList).forEach(file => {
      const ext = file.name.split(".").pop().toLowerCase();
      if (!["csv", "md"].includes(ext)) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        if (ext === "csv") {
          const { headers, rows } = parseCSV(text);
          setUserFiles(prev => [...prev.filter(f => f.name !== file.name), { name: file.name, type: "csv", headers, rows }]);
        } else {
          const rows = parseMD(text, file.name.replace(".md", ""));
          setUserFiles(prev => [...prev.filter(f => f.name !== file.name), { name: file.name, type: "md", headers: ["제목", "내용"], rows }]);
        }
      };
      reader.readAsText(file, "UTF-8");
    });
  };

  const removeUserFile = (name) => setUserFiles(prev => prev.filter(f => f.name !== name));

  const allRows = useMemo(() => [...sharedFiles, ...userFiles].flatMap(f => f.rows), [sharedFiles, userFiles]);
  const hasData = allRows.length > 0;

  const results = useMemo(() => {
    if (!submitted.trim() || !allRows.length) return [];
    const tokens = tokenize(submitted);
    const scored = allRows.map(row => {
      const values = Object.entries(row).filter(([k]) => !k.startsWith("_")).map(([, v]) => String(v).toLowerCase()).join(" ");
      const matchCount = tokens.filter(t => values.includes(t)).length;
      return { row, matchCount };
    }).filter(s => s.matchCount > 0);
    scored.sort((a, b) => b.matchCount - a.matchCount);
    return scored.map(s => s.row);
  }, [submitted, allRows]);

  const handleSearch = () => {
    if (!query.trim()) return;
    if (selectedEngine) {
      window.open(externalEngines.find(e => e.id === selectedEngine).url(query), "_blank");
    } else {
      setSubmitted(query.trim());
    }
  };

  const totalFiles = sharedFiles.length + userFiles.length;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f0c29 0%, #1a1a3e 50%, #0f0c29 100%)",
      fontFamily: "'Segoe UI', 'Apple SD Gothic Neo', sans-serif",
      color: "#e0e0f0"
    }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(90deg, rgba(99,102,241,0.15), rgba(168,85,247,0.15))",
        borderBottom: "1px solid rgba(99,102,241,0.3)",
        padding: "18px 32px", display: "flex", alignItems: "center", justifyContent: "space-between"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => setPage("search")}>
          <div style={{
            width: 38, height: 38, background: "linear-gradient(135deg, #6366f1, #a855f7)",
            borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, boxShadow: "0 0 16px rgba(99,102,241,0.5)"
          }}>🎮</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#f0f0ff" }}>게임 규칙 검색 엔진</div>
            <div style={{ fontSize: 11, color: "rgba(160,160,200,0.5)", marginTop: 1 }}>Game Rule Search Engine</div>
          </div>
        </div>
        <button onClick={() => setPage(page === "files" ? "search" : "files")} style={{
          display: "flex", alignItems: "center", gap: 8, padding: "8px 18px", borderRadius: 20,
          background: page === "files" ? "rgba(99,102,241,0.25)" : "rgba(255,255,255,0.05)",
          border: "1.5px solid " + (page === "files" ? "rgba(99,102,241,0.6)" : "rgba(255,255,255,0.12)"),
          color: page === "files" ? "#a5b4fc" : "rgba(180,180,220,0.6)",
          fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s"
        }}>
          <span>📂</span>
          <span>데이터 파일 관리</span>
          {totalFiles > 0 && (
            <span style={{ background: "rgba(99,102,241,0.4)", color: "#c7d2fe", borderRadius: 10, padding: "1px 7px", fontSize: 11, fontWeight: 700 }}>{totalFiles}</span>
          )}
        </button>
      </div>

      {/* 검색 페이지 */}
      {page === "search" && (
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "52px 24px" }}>
          <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 16 }}>
            <EngineBtn active={!selectedEngine} color="#6366f1" onClick={() => setSelectedEngine(null)} label="📔 내부 검색" />
            {externalEngines.map(e => (
              <EngineBtn key={e.id} active={selectedEngine === e.id} color={e.color}
                onClick={() => setSelectedEngine(selectedEngine === e.id ? null : e.id)} label={e.label} />
            ))}
          </div>

          <div style={{
            display: "flex", background: "rgba(255,255,255,0.04)",
            border: "1.5px solid rgba(99,102,241,0.4)", borderRadius: 14, overflow: "hidden",
            boxShadow: "0 0 30px rgba(99,102,241,0.15)"
          }}>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder={
                !hasData && !selectedEngine ? "먼저 데이터 파일을 업로드해주세요"
                : selectedEngine ? externalEngines.find(e2 => e2.id === selectedEngine).label + "에서 검색..."
                : "키워드를 입력하세요 (예: 확률 표기, 전투, 레벨)"
              }
              disabled={!hasData && !selectedEngine}
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                padding: "16px 20px", fontSize: 15, color: "#e8e8ff", caretColor: "#6366f1",
                opacity: (!hasData && !selectedEngine) ? 0.4 : 1
              }}
            />
            <button onClick={handleSearch}
              disabled={!query.trim() || (!hasData && !selectedEngine)}
              style={{
                padding: "0 28px", background: "linear-gradient(135deg, #6366f1, #a855f7)",
                border: "none", color: "#fff", fontSize: 14, fontWeight: 700,
                cursor: (query.trim() && (hasData || selectedEngine)) ? "pointer" : "not-allowed",
                opacity: (query.trim() && (hasData || selectedEngine)) ? 1 : 0.4, transition: "opacity 0.2s"
              }}>검색</button>
          </div>
          <div style={{ textAlign: "center", marginTop: 10, fontSize: 12, color: "rgba(140,140,180,0.4)" }}>
            Enter 또는 검색 버튼 · 띄어쓰기로 여러 키워드 동시 검색 가능
          </div>

          {submitted && !selectedEngine && (
            <div style={{ marginTop: 36 }}>
              <Divider label={"검색 결과 · \"" + submitted + "\" · " + results.length + "건"} />
              {results.length === 0 ? (
                <div style={{ textAlign: "center", padding: "52px 0", color: "rgba(160,160,200,0.4)", fontSize: 14 }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
                  일치하는 항목이 없습니다.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 20 }}>
                  {results.map((row, i) => {
                    const visibleKeys = Object.keys(row).filter(k => !k.startsWith("_"));
                    const isMd = row._type === "md";
                    return (
                      <div key={row._type + "-" + row._id + "-" + i} style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid " + (isMd ? "rgba(168,85,247,0.25)" : "rgba(99,102,241,0.25)"),
                        borderLeft: "3px solid " + (isMd ? "#a855f7" : "#6366f1"),
                        borderRadius: 14, padding: "18px 22px", overflow: "hidden"
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                          <span style={{
                            width: 22, height: 22,
                            background: isMd ? "rgba(168,85,247,0.3)" : "rgba(99,102,241,0.3)",
                            borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 11, color: isMd ? "#d8b4fe" : "#a5b4fc", fontWeight: 800, flexShrink: 0
                          }}>{i + 1}</span>
                          <span style={{
                            fontSize: 11, padding: "2px 8px", borderRadius: 10,
                            background: isMd ? "rgba(168,85,247,0.15)" : "rgba(99,102,241,0.15)",
                            color: isMd ? "#d8b4fe" : "#a5b4fc",
                            border: "1px solid " + (isMd ? "rgba(168,85,247,0.3)" : "rgba(99,102,241,0.3)")
                          }}>{isMd ? "📝 MD" : "📊 CSV"}</span>
                          {row._file && <span style={{ fontSize: 11, color: "rgba(160,160,200,0.35)" }}>{row._file}</span>}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {visibleKeys.map(k => row[k] ? (
                            <div key={k} style={{ display: "flex", gap: 10, alignItems: "flex-start", minWidth: 0 }}>
                              <span style={{
                                minWidth: 80, maxWidth: 80, fontSize: 11,
                                color: isMd ? "#d8b4fe" : "#a5b4fc",
                                background: isMd ? "rgba(168,85,247,0.15)" : "rgba(99,102,241,0.15)",
                                borderRadius: 6, padding: "2px 8px", textAlign: "center", marginTop: 1, flexShrink: 0
                              }}>{k}</span>
                              <span style={{
                                fontSize: 13.5, color: "rgba(210,210,240,0.8)", lineHeight: 1.75,
                                whiteSpace: "pre-wrap", wordBreak: "break-word", overflowWrap: "break-word",
                                minWidth: 0, flex: 1
                              }}>
                                <Highlight text={row[k]} keyword={submitted} />
                              </span>
                            </div>
                          ) : null)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {!submitted && hasData && (
            <div style={{ textAlign: "center", marginTop: 56, color: "rgba(140,140,180,0.35)", fontSize: 14 }}>
              <div style={{ fontSize: 48, marginBottom: 14, opacity: 0.2 }}>📖</div>
              키워드를 입력하고 게임 규칙을 검색해보세요
            </div>
          )}
        </div>
      )}

      {/* 파일 관리 페이지 */}
      {page === "files" && (
        <FilePage
          sharedFiles={sharedFiles} userFiles={userFiles}
          dragOver={dragOver} setDragOver={setDragOver}
          loadUserFiles={loadUserFiles} removeUserFile={removeUserFile}
          onDone={() => setPage("search")} fileRef={fileRef}
        />
      )}
      <input ref={fileRef} type="file" accept=".csv,.md" multiple style={{ display: "none" }}
        onChange={e => loadUserFiles(e.target.files)} />
    </div>
  );
}