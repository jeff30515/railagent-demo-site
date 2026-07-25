import type { DataSourceMapping } from './schemas.js';

const sampleNotice = '依照 HackRail 官方資料指南分類製作的內建示範資料；尚未連接正式即時資料源。';

export const officialDataGuideUrl = 'https://www.hackrail.tw/info/dataguide';
const officialReferenceUrl = officialDataGuideUrl;

export const dataGuideSources: DataSourceMapping[] = [
  {
    mode: 'sample',
    datasetId: 'new-taipei-ats-log',
    sourceDataset: 'new-taipei-ats-log',
    sourceName: '新北捷運 ATS LOG',
    officialPriority: 'first',
    officialReferenceUrl,
    owner: '新北捷運',
    officialCategory: 'ATS 營運與事件日誌',
    licenseNote: '用於 HackRail 示範版可追溯展示；正式環境需替換為官方資料匯出或介接。',
    sampleGeneratedAt: '2026-06-01T00:00:00+08:00',
    sampleNotice,
    sampleFile: 'web/src/data/new-taipei-ats-log.sample.json',
    liveIntegrationStatus: 'not-connected',
    replacementGuidance: '將官方 ATS 時間、車次、車廂、設備、事件、狀態與數值欄位映射到 NormalizedLogRecord。',
    fields: [
      { sourceField: 'log_time', normalizedField: 'timestamp', description: '台灣本地事件時間。' },
      { sourceField: 'train_no', normalizedField: 'trainId', description: '列車或編組識別碼。' },
      { sourceField: 'car_no', normalizedField: 'carId', description: '有資料時記錄車廂識別碼。' },
      { sourceField: 'equipment_id', normalizedField: 'deviceId', description: '車門、號誌或子系統識別碼。' },
      { sourceField: 'event_code', normalizedField: 'eventCode', description: '正規化事件，例如 DOOR_FAIL 或 DOOR_RETRY。' },
      { sourceField: 'event_level', normalizedField: 'status', description: '營運狀態映射為 ok、warning 或 error。' }
    ],
    agentUses: ['日誌分析代理偵測重複車門事件。', '維修代理將異常轉成健康分數。']
  },
  {
    mode: 'sample',
    datasetId: 'tymetro-train-telemetry',
    sourceDataset: 'tymetro-train-telemetry',
    sourceName: '桃園捷運列車遙測',
    officialPriority: 'first',
    officialReferenceUrl,
    owner: '桃園捷運',
    officialCategory: '列車營運與子系統遙測',
    licenseNote: '用於 HackRail 示範版可追溯展示；正式環境需替換為官方遙測資料源。',
    sampleGeneratedAt: '2026-06-01T00:00:00+08:00',
    sampleNotice,
    sampleFile: 'web/src/data/tymetro-train-telemetry.sample.json',
    liveIntegrationStatus: 'not-connected',
    replacementGuidance: '將列車遙測時間、列車、子系統、量測代碼、數值與單位映射到 NormalizedLogRecord。',
    fields: [
      { sourceField: 'sample_time', normalizedField: 'timestamp', description: '遙測取樣時間。' },
      { sourceField: 'train_id', normalizedField: 'trainId', description: '列車識別碼。' },
      { sourceField: 'subsystem', normalizedField: 'deviceId', description: '空調、牽引電力、VVVF 或相關子系統。' },
      { sourceField: 'metric_code', normalizedField: 'eventCode', description: '映射到 HVAC_TEMP、POWER_VOLTAGE 或其他規則。' },
      { sourceField: 'metric_value', normalizedField: 'value', description: '量測數值。' },
      { sourceField: 'metric_unit', normalizedField: 'unit', description: '門檻判斷使用的量測單位。' }
    ],
    agentUses: ['日誌分析代理偵測空調與電壓異常。', '維修代理將遙測資料納入資產風險。']
  },
  {
    mode: 'sample',
    datasetId: 'ntmetro-lost-items',
    sourceDataset: 'ntmetro-lost-items',
    sourceName: '新北捷運遺失物',
    officialPriority: 'first',
    officialReferenceUrl,
    owner: '新北捷運',
    officialCategory: '遺失物登錄資料',
    licenseNote: '用於 HackRail 示範版可追溯展示；正式環境需替換為官方遺失物資料匯出。',
    sampleGeneratedAt: '2026-06-01T00:00:00+08:00',
    sampleNotice,
    sampleFile: 'web/src/data/ntmetro-lost-items.sample.json',
    liveIntegrationStatus: 'not-connected',
    replacementGuidance: '映射官方物品編號、拾獲時間、車站、物品類別、顏色、描述與狀態。',
    fields: [
      { sourceField: 'item_no', normalizedField: 'itemId', description: '遺失物識別碼。' },
      { sourceField: 'found_time', normalizedField: 'foundTime', description: '物品登錄時間。' },
      { sourceField: 'station_name', normalizedField: 'station', description: '拾獲物品的車站。' },
      { sourceField: 'item_category', normalizedField: 'itemType', description: '物品類型，例如背包或雨傘。' },
      { sourceField: 'color', normalizedField: 'color', description: '可辨識的物品顏色。' },
      { sourceField: 'item_description', normalizedField: 'description', description: '用於比對的文字描述。' }
    ],
    agentUses: ['服務代理抽取遺失物線索。', '遺失物比對器排序候選紀錄。']
  },
  {
    mode: 'sample',
    datasetId: 'ntmetro-service-cases',
    sourceDataset: 'ntmetro-service-cases',
    sourceName: '新北捷運客服案件統計',
    officialPriority: 'first',
    officialReferenceUrl,
    owner: '新北捷運',
    officialCategory: '客服處理案件',
    licenseNote: '用於 HackRail 示範版可追溯展示；正式環境需替換為官方客服案件匯出。',
    sampleGeneratedAt: '2026-06-01T00:00:00+08:00',
    sampleNotice,
    sampleFile: 'web/src/data/ntmetro-service-cases.sample.json',
    liveIntegrationStatus: 'not-connected',
    replacementGuidance: '映射案件編號、建立時間、車站、通路、描述、分類與狀態。',
    fields: [
      { sourceField: 'case_no', normalizedField: 'caseId', description: '服務案件識別碼。' },
      { sourceField: 'opened_time', normalizedField: 'openedAt', description: '案件建立時間。' },
      { sourceField: 'station_name', normalizedField: 'station', description: '案件相關車站。' },
      { sourceField: 'case_channel', normalizedField: 'channel', description: '進件通路。' },
      { sourceField: 'case_summary', normalizedField: 'description', description: '用於分類的旅客文字。' },
      { sourceField: 'case_status', normalizedField: 'status', description: '流程狀態。' }
    ],
    agentUses: ['服務代理分類案件。', 'PM 總覽可顯示服務量與回覆狀態。']
  },
  {
    mode: 'sample',
    datasetId: 'sop-chunks',
    sourceDataset: 'sop-chunks',
    sourceName: '鐵道營運與客服 SOP 片段',
    officialPriority: 'first',
    officialReferenceUrl,
    owner: 'RailAgent 示範團隊依競賽提供 SOP/PDF 材料整理',
    officialCategory: 'SOP 與知識片段',
    licenseNote: '示範片段為摘要式樣本；正式環境需替換為核准 SOP 語料。',
    sampleGeneratedAt: '2026-06-01T00:00:00+08:00',
    sampleNotice,
    sampleFile: 'web/src/data/sop-chunks.sample.json',
    liveIntegrationStatus: 'not-connected',
    replacementGuidance: '以來源文件、片段 ID、標籤與 embedding id 儲存，保留未來升級 Azure AI Search 的空間。',
    fields: [
      { sourceField: 'chunk_id', normalizedField: 'chunkId', description: '穩定的片段識別碼。' },
      { sourceField: 'document_title', normalizedField: 'sourceDocument', description: '來源 SOP 或 PDF 名稱。' },
      { sourceField: 'section_title', normalizedField: 'title', description: '片段標題。' },
      { sourceField: 'chunk_text', normalizedField: 'body', description: '知識問答代理回傳的 grounding 文字。' },
      { sourceField: 'tags', normalizedField: 'tags', description: '檢索與分類標籤。' },
      { sourceField: 'embedding_id', normalizedField: 'embeddingId', description: '保留給 Azure AI Search 向量索引的識別鍵。' }
    ],
    agentUses: ['知識問答代理以 SOP 片段回答。', '維修與服務代理可引用處置程序。']
  }
];

export const dataGuideSourcesById = Object.fromEntries(
  dataGuideSources.map((source) => [source.sourceDataset, source])
) as Record<DataSourceMapping['sourceDataset'], DataSourceMapping>;
