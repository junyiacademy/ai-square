'use client';

import { useState, useEffect } from 'react';
import { Trash2, GitBranch, RefreshCw } from 'lucide-react';

interface Branch {
  name: string;
}

export default function BranchesPage() {
  const [branches, setBranches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingBranch, setDeletingBranch] = useState<string | null>(null);

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/git/pr/cleanup');
      const data = await response.json();
      setBranches(data.branches || []);
    } catch (error) {
      console.error('Failed to load branches:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteBranch = async (branch: string) => {
    if (!confirm(`確定要刪除分支 ${branch} 嗎？`)) return;

    setDeletingBranch(branch);
    try {
      const response = await fetch('/api/git/pr/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Show success toast
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
        toast.textContent = `✅ 已刪除分支 ${branch}`;
        document.body.appendChild(toast);
        
        setTimeout(() => {
          document.body.removeChild(toast);
        }, 3000);

        // Reload branches
        loadBranches();
      } else {
        alert(`無法刪除分支: ${data.message}`);
      }
    } catch (error) {
      console.error('Delete branch error:', error);
      alert('刪除分支失敗');
    } finally {
      setDeletingBranch(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <GitBranch className="w-6 h-6" />
              分支管理
            </h1>
            <button
              onClick={loadBranches}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              重新整理
            </button>
          </div>

          {branches.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <GitBranch className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>沒有找到 CMS 建立的分支</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-gray-600 mb-4">
                找到 {branches.length} 個 CMS 分支。合併後的分支可以安全刪除。
              </p>
              {branches.map((branch) => (
                <div
                  key={branch}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <GitBranch className="w-4 h-4 text-gray-500" />
                    <span className="font-mono text-sm">{branch}</span>
                  </div>
                  <button
                    onClick={() => deleteBranch(branch)}
                    disabled={deletingBranch === branch}
                    className="flex items-center gap-2 px-3 py-1 text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50"
                  >
                    {deletingBranch === branch ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    刪除
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              💡 <strong>提示</strong>：您也可以在 GitHub Repository Settings 中啟用
              「Automatically delete head branches」，讓 PR 合併後自動刪除分支。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}