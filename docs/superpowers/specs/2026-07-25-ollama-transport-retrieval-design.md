# Ollama 運輸知識檢索回答設計

## 目標

讓 RailAgent 對話與友善轉乘 API 在回答前檢索本機 `data/transport-knowledge/*.jsonl`。查到資料時，Ollama 依來源內容回答並回傳可追溯來源；查不到資料時，Ollama 可使用一般知識回答，但須標示未使用本機下載資料。

## 回答契約

- 有相關文件：回答使用檢索上下文，回傳 `knowledgeMode: "local-sources"`、來源 URL 與下載時間。
- 無相關文件：回答可使用模型一般知識，回傳 `knowledgeMode: "model-knowledge"`，並提示未使用本機下載資料。
- 涉及班次、票價、營運異動、安全或無障礙現況：無論模式，都提示以官方即時資訊或現場人員為準。
- 本機資料不足時不得把模型推測偽裝為官方資料。

## 架構

新增可測試的本機檢索器，從 JSONL 載入文件、以繁中/英文關鍵字計分並取最多五筆。`/api/passenger-chat` 和 `/api/friendly-transfer/route` 共用該檢索器，將來源文字、URL、下載時間與模式規則置入 Ollama prompt。API 回應擴充為 `knowledgeMode` 與 `sources`。

## 驗證

- 相關問題的 Ollama prompt 含匹配文件，回應含來源。
- 不相關問題的 prompt 明確允許一般知識並標示無本機來源。
- 資料檔不存在或無效時服務仍可回覆一般知識，不會中斷 API。
- 既有遺失物與轉乘測試仍通過。
