import { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import api from '../lib/axios';

export default function AssistantQA() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setAnswer('');
    try {
      const res = await api.post('/qa/ask', { question: question.trim() });
      setAnswer(res.data?.answer ?? res.data?.content ?? '');
    } catch {
      setAnswer('请求失败，请稍后重试。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">AI智能问答</h1>
        <p className="text-sm text-neutral-500 mt-1">支持自然语言查询投诉数据、获取结论与建议</p>
      </div>

      <div className="bg-white border border-neutral-200 rounded-lg shadow-sm p-6 flex flex-col gap-4">
        <div>
          <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">问题</label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow"
            placeholder="例如：本周重复投诉最多的一级分类是什么？对应的三层根因分别是什么？"
          />
        </div>
        <div className="flex justify-end">
          <button
            onClick={handleAsk}
            disabled={loading || !question.trim()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-neutral-900 rounded-md hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {loading ? '正在分析...' : '发送'}
          </button>
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-lg shadow-sm p-6">
        <div className="text-[13px] font-semibold text-neutral-900 mb-2">回答</div>
        {answer ? (
          <div className="whitespace-pre-wrap text-sm text-neutral-800 leading-relaxed">{answer}</div>
        ) : (
          <div className="text-sm text-neutral-500">暂无内容</div>
        )}
      </div>
    </div>
  );
}

