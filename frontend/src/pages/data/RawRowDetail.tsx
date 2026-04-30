import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../lib/axios';
import { useToast } from '../../components/ui/Toast';

export default function RawRowDetail() {
  const { rowId } = useParams();
  const navigate = useNavigate();
  const { showToast, ToastComponent } = useToast();
  const [payload, setPayload] = useState<Record<string, any>>({});
  const [rowNo, setRowNo] = useState<number | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);

  const entries = useMemo(() => Object.entries(payload || {}), [payload]);

  useEffect(() => {
    if (!rowId) return;
    const fetchDetail = async () => {
      try {
        const res = await api.get(`/raw/rows/${rowId}`);
        setPayload(res.data?.payload || {});
        setRowNo(res.data?.rowNo ?? null);
        setBatchId(res.data?.batchId ?? null);
      } catch (e: any) {
        showToast(e?.response?.data?.msg || '原始行不存在', 'error');
        navigate('/data/raw');
      }
    };
    fetchDetail();
  }, [rowId]);

  return (
    <div className="flex flex-col gap-6">
      {ToastComponent}

      <div className="flex items-center justify-between">
        <div className="text-sm text-neutral-600">
          <span className="text-neutral-500">批次：</span>
          <span className="font-mono">{batchId || '-'}</span>
          <span className="mx-3 text-neutral-300">|</span>
          <span className="text-neutral-500">行号：</span>
          <span className="font-mono">{rowNo ?? '-'}</span>
        </div>
        {batchId && (
          <button
            onClick={() => navigate(`/data/raw/${batchId}`)}
            className="text-[13px] font-medium text-neutral-700 hover:text-neutral-900 transition-colors"
          >
            返回批次
          </button>
        )}
      </div>

      <div className="bg-white border border-neutral-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50/50">
                <th className="px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">字段</th>
                <th className="px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">值</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {entries.map(([k, v]) => (
                <tr key={k} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-neutral-700 whitespace-nowrap">{k}</td>
                  <td className="px-6 py-4 text-sm text-neutral-700 whitespace-pre-wrap break-words">{v == null ? '-' : String(v)}</td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-6 py-12 text-center text-sm text-neutral-500">
                    暂无数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

