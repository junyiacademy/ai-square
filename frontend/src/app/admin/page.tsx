import Link from "next/link";
import {
  FileEdit,
  PlusCircle,
  Database,
  Layout,
  Server,
  Wand2,
  MousePointer,
  PanelLeft,
} from "lucide-react";

export default function AdminPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">管理控制台</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Ultimate Unified Agent Editor - All Features in One! */}
        <Link
          href="/admin/scenarios/agent-editor?id=new"
          className="col-span-full block p-8 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-xl shadow-xl hover:shadow-2xl transition-all border-2 border-indigo-300 hover:border-indigo-400 transform hover:scale-[1.02]"
        >
          <div className="flex items-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Wand2 className="w-9 h-9 text-white" />
            </div>
            <div className="ml-4">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                🤖 場景編輯器
              </h2>
              <span className="text-xs font-semibold text-green-600 bg-green-100 px-3 py-1 rounded-full ml-2">
                ALL-IN-ONE 終極版
              </span>
            </div>
          </div>
          <p className="text-gray-700 mb-6 text-xl font-medium">
            n8n 風格專業介面 + AI 智能對話 + 前台視覺設計 + 多模式編輯 -
            一個編輯器搞定所有需求！
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-white/80 rounded-lg p-4 border-2 border-indigo-200 hover:border-indigo-400 transition-all">
              <PanelLeft className="w-6 h-6 text-indigo-600 mb-2" />
              <div className="text-sm font-bold text-gray-800">3面板佈局</div>
              <div className="text-xs text-gray-500">可收合導航</div>
            </div>
            <div className="bg-white/80 rounded-lg p-4 border-2 border-purple-200 hover:border-purple-400 transition-all">
              <Wand2 className="w-6 h-6 text-purple-600 mb-2" />
              <div className="text-sm font-bold text-gray-800">AI 對話</div>
              <div className="text-xs text-gray-500">自然語言編輯</div>
            </div>
            <div className="bg-white/80 rounded-lg p-4 border-2 border-blue-200 hover:border-blue-400 transition-all">
              <Layout className="w-6 h-6 text-blue-600 mb-2" />
              <div className="text-sm font-bold text-gray-800">視覺預覽</div>
              <div className="text-xs text-gray-500">前台風格設計</div>
            </div>
            <div className="bg-white/80 rounded-lg p-4 border-2 border-pink-200 hover:border-pink-400 transition-all">
              <MousePointer className="w-6 h-6 text-pink-600 mb-2" />
              <div className="text-sm font-bold text-gray-800">點擊編輯</div>
              <div className="text-xs text-gray-500">所見即所得</div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-indigo-100 to-purple-100 rounded-lg p-4 mb-6">
            <div className="font-bold text-gray-800 mb-2">
              ✨ 整合所有優點：
            </div>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• n8n 專業 3 面板佈局（左導航、中預覽、右 AI）</li>
              <li>• AI Agent 自然語言對話編輯</li>
              <li>• 前台風格漂亮視覺設計（漸層卡片）</li>
              <li>• 點擊編輯 + 彈窗修改雙重方式</li>
              <li>• 自動保存 + 版本控制</li>
            </ul>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center text-indigo-600 font-bold text-lg">
              <span>開始使用終極編輯器</span>
              <svg
                className="w-6 h-6 ml-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
            <div className="text-sm text-gray-500">取代了 3 個舊編輯器</div>
          </div>
        </Link>

        {/* Database Management Card */}
        <Link
          href="/admin/database"
          className="block p-6 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow opacity-50 pointer-events-none"
        >
          <div className="flex items-center mb-4">
            <Database className="w-8 h-8 text-purple-600" />
            <h2 className="text-xl font-semibold ml-3">資料庫管理</h2>
          </div>
          <p className="text-gray-600 mb-4">
            管理資料庫內容，執行查詢和維護操作。
          </p>
          <div className="flex items-center text-purple-600">
            <span className="text-sm font-medium">即將推出</span>
          </div>
        </Link>
      </div>

      <div className="mt-12 p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border-2 border-indigo-200">
        <h2 className="text-xl font-bold mb-3 text-gray-800">🚀 快速開始</h2>
        <p className="text-gray-700 mb-4">
          使用 <strong>場景編輯器</strong> 可以用多種方式編輯課程內容：
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white/80 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-2">💬 AI 對話編輯</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• 告訴 AI：「把標題改成...」</li>
              <li>• 自然語言指令自動更新</li>
              <li>• 快速建議按鈕</li>
            </ul>
          </div>
          <div className="bg-white/80 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-2">👆 視覺化編輯</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• 點擊編輯圖示彈窗修改</li>
              <li>• 前台風格視覺預覽</li>
              <li>• 自動保存 + 發布控制</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
