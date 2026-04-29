
import { useState, useEffect } from 'react';
import { Play, Settings, RotateCcw, FileText, X, Trash2 } from 'lucide-react';
import { format, parseISO, differenceInSeconds } from 'date-fns';
import axios from '../lib/axios';
import DataTable from '../components/DataTable';
import type { Column } from '../components/DataTable';

interface CrawlerTaskLog {
    id: number;
    taskName: string;
    taskType: string;
    status: string;
    startTime: string;
    endTime: string;
    logDetail: string;
    result: string;
    triggerType: string;
    successCount: number;
    skipCount: number;
    failCount: number;
    createTime: string;
}

export default function CrawlerTaskList() {
    const [data, setData] = useState<CrawlerTaskLog[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [size, setSize] = useState(10);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);
    const [isCaseCollecting, setIsCaseCollecting] = useState(false);
    const [isNoticeCollecting, setIsNoticeCollecting] = useState(false);
    const [currentLog, setCurrentLog] = useState('');
    
    const [scheduleCron, setScheduleCron] = useState('');
    const [scheduleEnabled, setScheduleEnabled] = useState(true);

    const fetchData = async () => {
        try {
            const res = await axios.get('/crawler/tasks', {
                params: { page, size }
            });
            if (res.data && res.data.records) {
                setData(res.data.records);
                setTotal(res.data.total);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchSettings = async () => {
        try {
            const res = await axios.get('/crawler/settings');
            if (res.data) {
                setScheduleCron(res.data.cron || '');
                setScheduleEnabled(res.data.enabled !== false);
            }
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchData();
    }, [page, size]);

    const handleRefresh = () => {
        setPage(1);
        fetchData();
    };

    const handleOpenSettings = () => {
        fetchSettings();
        setIsSettingsModalOpen(true);
    };

    const handleSaveSettings = async () => {
        try {
            await axios.post('/crawler/settings', { cron: scheduleCron, enabled: scheduleEnabled });
            alert('采集设置保存成功！');
            setIsSettingsModalOpen(false);
        } catch (err) {
            console.error(err);
            alert('设置保存失败');
        }
    };

    const handleCaseCollect = async () => {
        if (!confirm('确定要触发公开案件采集任务吗？\n这将采集公开案件列表、详情，并同步到主数据库。')) return;
        setIsCaseCollecting(true);
        try {
            const res = await axios.post('/crawler/case-collect');
            if (res.data && res.data.success) {
                alert('公开案件采集与同步任务完成！');
            } else {
                alert('任务执行完成');
            }
            setTimeout(handleRefresh, 1000);
        } catch (err: any) {
            console.error(err);
            alert('触发失败: ' + (err.response?.data?.error || err.message));
        } finally {
            setIsCaseCollecting(false);
        }
    };

    const handleNoticeCollect = async () => {
        if (!confirm('确定要触发公开公告采集任务吗？\n这将采集公开公告列表、详情，并同步到主数据库。')) return;
        setIsNoticeCollecting(true);
        try {
            const res = await axios.post('/crawler/notice-collect');
            if (res.data && res.data.success) {
                alert('公开公告采集与同步任务完成！');
            } else {
                alert('任务执行完成');
            }
            setTimeout(handleRefresh, 1000);
        } catch (err: any) {
            console.error(err);
            alert('触发失败: ' + (err.response?.data?.error || err.message));
        } finally {
            setIsNoticeCollecting(false);
        }
    };

    const handleViewLog = (logDetail: string) => {
        setCurrentLog(logDetail || '无日志记录');
        setIsLogModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('确定要删除这条任务记录吗？')) return;
        try {
            await axios.delete(`/crawler/tasks/${id}`);
            alert('删除成功！');
            handleRefresh();
        } catch (err: any) {
            console.error(err);
            alert('删除失败: ' + (err.response?.data?.error || err.message));
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'RUNNING':
                return <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium bg-blue-50 text-blue-600 border border-blue-100">运行中</span>;
            case 'SUCCESS':
                return <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-600 border border-emerald-100">成功</span>;
            case 'FAILED':
                return <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium bg-red-50 text-red-600 border border-red-100">失败</span>;
            default:
                return <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium bg-neutral-100 text-neutral-500 border border-neutral-200">{status || '未知'}</span>;
        }
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        try {
            return format(new Date(dateStr), 'yyyy-MM-dd HH:mm:ss');
        } catch {
            return dateStr;
        }
    };

    const formatDuration = (startTime: string, endTime: string) => {
        if (!startTime || !endTime) return '-';
        try {
            const start = parseISO(startTime);
            const end = parseISO(endTime);
            const seconds = differenceInSeconds(end, start);
            
            if (seconds < 60) {
                return `${seconds}秒`;
            } else if (seconds < 3600) {
                const minutes = Math.floor(seconds / 60);
                const remainingSeconds = seconds % 60;
                return `${minutes}分${remainingSeconds}秒`;
            } else {
                const hours = Math.floor(seconds / 3600);
                const minutes = Math.floor((seconds % 3600) / 60);
                return `${hours}小时${minutes}分`;
            }
        } catch {
            return '-';
        }
    };

    const getTriggerTypeLabel = (triggerType: string) => {
        switch (triggerType) {
            case 'MANUAL':
                return <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium bg-blue-50 text-blue-600 border border-blue-100">手动触发</span>;
            case 'SCHEDULED':
                return <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium bg-purple-50 text-purple-600 border border-purple-100">定时任务</span>;
            default:
                return <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium bg-neutral-100 text-neutral-500 border border-neutral-200">{triggerType || '未知'}</span>;
        }
    };

    const columns: Column[] = [
        { title: '任务ID', dataIndex: 'id', render: (v) => <span className="font-medium text-neutral-900">#{v}</span> },
        { title: '开始时间', dataIndex: 'startTime', render: (v) => formatDate(v) },
        { title: '结束时间', dataIndex: 'endTime', render: (v) => formatDate(v) },
        { title: '状态', dataIndex: 'status', render: (v) => getStatusBadge(v) },
        { title: '耗时', dataIndex: 'id', render: (_v, record) => formatDuration(record.startTime, record.endTime) },
        { title: '采集结果', dataIndex: 'successCount', render: (_v, record) => (
            <span className="text-sm">
                <span className="text-emerald-600">成功{record.successCount || 0}</span>
                {' / '}
                <span className="text-yellow-600">跳过{record.skipCount || 0}</span>
                {' / '}
                <span className="text-red-600">失败{record.failCount || 0}</span>
            </span>
        )},
        { title: '触发方式', dataIndex: 'triggerType', render: (v) => getTriggerTypeLabel(v) }
    ];

    return (
        <div className="flex flex-col gap-6 relative">
            {/* 两类采集任务触发区域 */}
            <div className="bg-white p-5 rounded-lg border border-neutral-200 shadow-sm">
                <h2 className="text-lg font-semibold text-neutral-900 mb-4">采集任务触发</h2>
                <p className="text-sm text-neutral-500 mb-4">选择要触发的采集任务类型</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button 
                        onClick={handleCaseCollect} 
                        disabled={isCaseCollecting || isNoticeCollecting}
                        className="flex items-center gap-3 px-6 py-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-md text-sm font-medium hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        <Play size={20} className={isCaseCollecting ? 'animate-spin' : ''} /> 
                        <div className="text-left">
                            <div className="font-medium">{isCaseCollecting ? '案件采集中...' : '公开案件采集'}</div>
                            <div className="text-xs text-blue-500 mt-1">采集案件列表、详情并同步</div>
                        </div>
                    </button>
                    <button 
                        onClick={handleNoticeCollect} 
                        disabled={isCaseCollecting || isNoticeCollecting}
                        className="flex items-center gap-3 px-6 py-4 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm font-medium hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        <Play size={20} className={isNoticeCollecting ? 'animate-spin' : ''} /> 
                        <div className="text-left">
                            <div className="font-medium">{isNoticeCollecting ? '公告采集中...' : '公开公告采集'}</div>
                            <div className="text-xs text-green-500 mt-1">采集公告列表、详情并同步</div>
                        </div>
                    </button>
                </div>
            </div>

            {/* 采集任务历史区域 */}
            <div className="bg-white p-5 rounded-lg border border-neutral-200 shadow-sm flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-semibold text-neutral-900">采集任务运行历史</h2>
                    <p className="text-sm text-neutral-500 mt-1">查看公开案件和公告的采集执行情况</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={handleRefresh} className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 text-neutral-700 rounded-md text-sm font-medium hover:bg-neutral-50 transition-colors">
                        <RotateCcw size={16} /> 刷新
                    </button>
                    <button onClick={handleOpenSettings} className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 text-neutral-700 rounded-md text-sm font-medium hover:bg-neutral-50 transition-colors">
                        <Settings size={16} /> 采集设置
                    </button>
                </div>
            </div>

            <DataTable 
                columns={columns} 
                data={data} 
                total={total} 
                current={page} 
                size={size} 
                onPageChange={setPage}
                onSizeChange={setSize}
                actions={(row) => (
                    <div className="flex gap-2">
                        <button onClick={() => handleViewLog(row.logDetail)} className="flex items-center gap-1 text-neutral-500 hover:text-neutral-900 transition-colors">
                            <FileText size={14} /> 查看日志
                        </button>
                        <button onClick={() => handleDelete(row.id)} className="flex items-center gap-1 text-neutral-500 hover:text-red-600 transition-colors">
                            <Trash2 size={14} /> 删除
                        </button>
                    </div>
                )}
            />

            {isSettingsModalOpen && (
                <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
                            <h3 className="text-base font-semibold text-neutral-900">采集设置</h3>
                            <button onClick={() => setIsSettingsModalOpen(false)} className="text-neutral-400 hover:text-neutral-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-2">定时调度 (Cron表达式)</label>
                                <input 
                                    type="text" 
                                    value={scheduleCron} 
                                    onChange={e => setScheduleCron(e.target.value)}
                                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow"
                                    placeholder="例如: 0 0 0 * * ?"
                                />
                                <p className="text-xs text-neutral-500 mt-2">默认每天 00:00 执行: 0 0 0 * * ?</p>
                            </div>
                            <div className="flex items-center justify-between pt-2">
                                <div>
                                    <label className="text-sm font-medium text-neutral-700">启用自动采集</label>
                                    <p className="text-xs text-neutral-500 mt-0.5">开启后将按配置的时间自动执行</p>
                                </div>
                                <button 
                                    onClick={() => setScheduleEnabled(!scheduleEnabled)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${scheduleEnabled ? 'bg-emerald-500' : 'bg-neutral-200'}`}>
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${scheduleEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-neutral-100 bg-neutral-50 flex justify-end gap-3">
                            <button onClick={() => setIsSettingsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors">
                                取消
                            </button>
                            <button onClick={handleSaveSettings} className="px-4 py-2 bg-neutral-900 text-white rounded-md text-sm font-medium hover:bg-neutral-800 transition-colors shadow-sm">
                                保存设置
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isLogModalOpen && (
                <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl h-[80vh] flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 shrink-0">
                            <h3 className="text-base font-semibold text-neutral-900 flex items-center gap-2">
                                <FileText size={18} className="text-neutral-500" />
                                执行日志
                            </h3>
                            <button onClick={() => setIsLogModalOpen(false)} className="text-neutral-400 hover:text-neutral-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 bg-neutral-50/50">
                            <pre className="text-xs font-mono text-neutral-700 whitespace-pre-wrap break-all bg-neutral-900 text-neutral-100 p-4 rounded-lg">
                                {currentLog}
                            </pre>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
