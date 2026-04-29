import React, { useState, useCallback, useEffect } from 'react';
import { Search, Building2, User, Network, FileText, BadgeCheck, Zap, Download, Loader2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from '../lib/axios';
import { useNavigate } from 'react-router-dom';

/**
 * 企业搜索结果类型定义
 */
interface EnterpriseSearchResult {
  id?: number;
  name: string;
  creditCode: string;
  legalPerson: string;
  registeredCapital: string;
  establishmentDate: string;
  address: string;
  businessScope: string;
  status: string;
  riskLevel?: string;
  enterpriseType?: string;
}

/**
 * 分页响应类型定义
 */
interface SearchResponse {
  records: EnterpriseSearchResult[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * 搜索标签页类型
 */
interface Tab {
  name: string;
  icon: React.ReactNode;
}

/**
 * 快捷链接类型
 */
interface QuickLink {
  name: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
}

/**
 * 搜索标签页组件
 */
const SearchTabs: React.FC<{
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tab: string) => void;
}> = ({ tabs, activeTab, onTabChange }) => {
  return (
    <div className="flex items-center justify-center gap-8 mb-4">
      {tabs.map((tab) => (
        <button
          key={tab.name}
          onClick={() => onTabChange(tab.name)}
          className={`flex items-center gap-2 pb-2 text-[15px] transition-colors relative ${
            activeTab === tab.name ? 'text-brand font-medium' : 'text-neutral-600 hover:text-brand'
          }`}
        >
          {tab.icon}
          {tab.name}
          {activeTab === tab.name && (
            <motion.div
              layoutId="searchTab"
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-[3px] bg-brand rounded-t-md"
            />
          )}
        </button>
      ))}
    </div>
  );
};

/**
 * 搜索框组件
 */
const SearchInput: React.FC<{
  query: string;
  onQueryChange: (query: string) => void;
  onSearch: (e: React.FormEvent) => void;
  loading: boolean;
  placeholder?: string;
}> = ({ query, onQueryChange, onSearch, loading, placeholder }) => {
  return (
    <form onSubmit={onSearch} className="w-full relative flex items-center shadow-[0_8px_30px_var(--color-brand-100)] rounded-lg overflow-hidden bg-white group focus-within:shadow-[0_8px_40px_var(--color-brand-100)] focus-within:ring-2 focus-within:ring-brand transition-all">
      <input
        type="text"
        className="w-full h-14 md:h-[60px] px-6 text-[16px] outline-none text-neutral-900 placeholder:text-neutral-400"
        placeholder={placeholder || '请输入企业名称、人名、品牌、统一社会信用代码等关键词'}
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        autoFocus
      />
      <button
        type="submit"
        disabled={loading}
        className="h-14 md:h-[60px] px-10 md:px-12 bg-brand hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed text-white text-[17px] font-medium transition-colors flex items-center gap-2 shrink-0"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Search size={20} />
        )}
        {loading ? '搜索中...' : '企业查询'}
      </button>
    </form>
  );
};

/**
 * 搜索结果项组件
 */
const SearchResultItem: React.FC<{
  item: EnterpriseSearchResult;
  onImport: (item: EnterpriseSearchResult) => void;
  importing: boolean;
}> = ({ item, onImport, importing }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-md transition-shadow">
      <div className="flex-1">
        <h3 className="text-xl font-bold text-brand mb-2">{item.name}</h3>
        <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-600 mb-2">
          {item.legalPerson !== '-' && <span>法定代表人：{item.legalPerson}</span>}
          {item.registeredCapital !== '-' && <span>注册资本：{item.registeredCapital}</span>}
          {item.establishmentDate !== '-' && <span>成立日期：{item.establishmentDate}</span>}
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-600">
          {item.creditCode !== '-' && <span>统一社会信用代码：{item.creditCode}</span>}
          <span className={`px-2 py-0.5 border rounded text-xs font-medium ${
            item.status === '存续' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
            item.status === '注销' ? 'bg-red-50 text-red-600 border-red-100' :
            'bg-neutral-50 text-neutral-600 border-neutral-100'
          }`}>
            {item.status}
          </span>
        </div>
        {item.address !== '-' && (
          <p className="text-sm text-neutral-500 mt-2 truncate">地址：{item.address}</p>
        )}
      </div>
      <button
        onClick={() => onImport(item)}
        disabled={importing}
        className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-brand rounded-md hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shrink-0"
      >
        {importing ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Download size={16} />
        )}
        {importing ? '导入中...' : '导入台账'}
      </button>
    </div>
  );
};

/**
 * 搜索结果列表组件
 */
const SearchResults: React.FC<{
  results: EnterpriseSearchResult[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onImport: (item: EnterpriseSearchResult) => void;
  importingId?: number;
  loading: boolean;
}> = ({ results, total, page, pageSize, onPageChange, onImport, importingId, loading }) => {
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="w-full mt-10 flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-neutral-800">
        搜索结果 ({total} 条)
      </h2>
      
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-brand" />
          <span className="ml-3 text-neutral-600">加载中...</span>
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-neutral-500">未找到相关企业</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            {results.map((item, index) => (
              <SearchResultItem
                key={item.id || index}
                item={item}
                onImport={onImport}
                importing={importingId === item.id}
              />
            ))}
          </div>
          
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className="p-2 rounded border border-neutral-200 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-sm text-neutral-600 px-4">
                第 {page} / {totalPages} 页
              </span>
              <button
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                className="p-2 rounded border border-neutral-200 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

/**
 * 热搜企业组件
 */
interface HotSearchProps {
  onHotSearchClick: (enterprise: string) => void;
}

const HotSearch: React.FC<HotSearchProps> = ({ onHotSearchClick }) => {
  const [hotEnterprises, setHotEnterprises] = useState<string[]>([
    '华为技术有限公司',
    '腾讯科技（深圳）有限公司',
    '北京字节跳动科技有限公司',
    '阿里巴巴（中国）网络技术有限公司'
  ]);
  const [loading, setLoading] = useState(true);

  // 获取热搜企业数据
  useEffect(() => {
    const fetchHotEnterprises = async () => {
      console.log('开始获取热搜企业数据...');
      try {
        const res = await axios.get<string[]>('/enterprises/hot-search');
        console.log('热搜接口返回数据:', res.data);
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          setHotEnterprises(res.data);
        } else {
          console.log('没有热搜数据，使用默认数据');
        }
      } catch (err) {
        console.error('获取热搜企业失败:', err);
        // 失败时使用默认数据，不影响用户体验
      } finally {
        setLoading(false);
      }
    };

    fetchHotEnterprises();
  }, []);

  if (loading) {
    return (
      <div className="mt-6 w-full flex items-center gap-3 text-[13px]">
        <span className="text-neutral-400 font-medium shrink-0">热搜企业：</span>
        <div className="flex items-center gap-2">
          <Loader2 className="w-3 h-3 animate-spin text-neutral-400" />
          <span className="text-neutral-400">加载中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 w-full flex items-center gap-3 text-[13px]">
      <span className="text-neutral-400 font-medium shrink-0">热搜企业：</span>
      <div className="flex flex-wrap gap-4 overflow-hidden h-5">
        {hotEnterprises.map((enterprise, index) => (
          <a
            key={index}
            href="#"
            className="text-neutral-500 hover:text-brand transition-colors truncate cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              onHotSearchClick(enterprise);
            }}
          >
            {enterprise}
          </a>
        ))}
      </div>
    </div>
  );
};

/**
 * 快捷链接组件
 */
const QuickLinks: React.FC<{ links: QuickLink[] }> = ({ links }) => {
  return (
    <div className="w-full mt-20 grid grid-cols-1 md:grid-cols-3 gap-6">
      {links.map((link) => (
        <button
          key={link.name}
          className="flex items-center gap-4 p-5 rounded-xl border border-neutral-100 bg-white hover:shadow-lg hover:-translate-y-1 transition-all group text-left"
          onClick={() => alert(`${link.name}功能开发中`)}
        >
          <div className={`w-12 h-12 rounded-full ${link.bg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
            <span className={link.color}>{link.icon}</span>
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-neutral-800 group-hover:text-brand transition-colors mb-1">
              {link.name}
            </h3>
            <p className="text-[12px] text-neutral-400">一键获取专业分析</p>
          </div>
        </button>
      ))}
    </div>
  );
};

/**
 * 错误提示组件
 */
const ErrorMessage: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => {
  return (
    <div className="w-full mt-10 bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-red-700">{message}</p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 text-sm text-red-700 bg-red-100 rounded hover:bg-red-200 transition-colors"
          >
            重试
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * 企业搜索主页面组件
 */
const EnterpriseSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('查企业');
  const [results, setResults] = useState<EnterpriseSearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [importingId, setImportingId] = useState<number | undefined>();
  const pageSize = 10;
  const navigate = useNavigate();

  const tabs: Tab[] = [
    { name: '查企业', icon: <Building2 size={16} /> },
    { name: '查老板', icon: <User size={16} /> },
    { name: '查关系', icon: <Network size={16} /> },
  ];

  const quickLinks: QuickLink[] = [
    { name: '企业信用报告', icon: <FileText size={20} />, color: 'text-brand-light', bg: 'bg-brand-light' },
    { name: '风险监控', icon: <BadgeCheck size={20} />, color: 'text-orange-500', bg: 'bg-orange-50' },
    { name: '财产线索', icon: <Zap size={20} />, color: 'text-purple-500', bg: 'bg-purple-50' },
  ];

  /**
     * 执行搜索
     */
    const performSearch = useCallback(async (searchQuery: string, searchPage: number = 1) => {
        if (!searchQuery.trim()) {
            return;
        }

        setLoading(true);
        setError(null);
        setHasSearched(true);

        try {
            const res = await axios.get<SearchResponse>('/enterprises/search', {
                params: {
                    keyword: searchQuery.trim(),
                    page: searchPage,
                    pageSize,
                },
            });

            setResults(res.data.records);
            setTotal(res.data.total);
            setPage(res.data.page);
        } catch (err) {
            console.error('Search failed:', err);
            setError('搜索服务暂时不可用，请检查后端服务是否已重启并确保数据库表已更新');
        } finally {
            setLoading(false);
        }
    }, []);

  /**
   * 处理搜索表单提交
   */
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query, 1);
  };

  /**
   * 处理页码变化
   */
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1) {
      performSearch(query, newPage);
    }
  };

  /**
   * 处理导入台账
   */
  const handleImport = async (enterprise: EnterpriseSearchResult) => {
    if (enterprise.id) {
      setImportingId(enterprise.id);
    }

    try {
      const res = await axios.post('/v1/enterprises', {
        name: enterprise.name,
        creditCode: enterprise.creditCode,
        legalPerson: enterprise.legalPerson !== '-' ? enterprise.legalPerson : null,
        registeredCapital: enterprise.registeredCapital !== '-' ? enterprise.registeredCapital : null,
        establishmentDate: enterprise.establishmentDate !== '-' ? enterprise.establishmentDate : null,
        address: enterprise.address !== '-' ? enterprise.address : null,
        businessScope: enterprise.businessScope !== '-' ? enterprise.businessScope : null,
        status: enterprise.status,
        riskLevel: enterprise.riskLevel || '正常',
        enterpriseType: enterprise.enterpriseType || '民营企业',
        cooperationStatus: '合作中',
      });

      if (typeof res.data === 'string' && res.data.startsWith('Error')) {
        alert(res.data);
      } else {
        alert('导入台账成功');
        navigate(`/enterprise/detail?id=${res.data.id}`);
      }
    } catch (err) {
      console.error('Import failed:', err);
      alert('导入失败，请稍后重试');
    } finally {
      setImportingId(undefined);
    }
  };

  /**
   * 处理标签页切换
   */
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab !== '查企业') {
      alert(`${tab}功能开发中，敬请期待`);
    }
  };

  /**
   * 处理热搜企业点击
   */
  const handleHotSearchClick = (enterprise: string) => {
    setQuery(enterprise);
    performSearch(enterprise, 1);
  };

  return (
    <div className="flex flex-col items-center min-h-full w-full bg-white relative overflow-hidden pb-20">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-[400px] bg-gradient-to-b from-[#eef2f9] to-white -z-10" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[400px] bg-[url('https://cloudcache.tencent-cloud.com/qcloud/ui/static/other_external_resource/42c0f600-458e-48e1-911e-bbf6e8147076.png')] bg-no-repeat bg-center bg-contain opacity-10 -z-10" />

      <div className="w-full max-w-[840px] px-6 mt-28 flex flex-col items-center">
        {/* Logo & Slogan */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center mb-12"
        >
          <div className="text-5xl font-extrabold text-brand tracking-tight mb-4 flex items-center gap-3">
            <Search size={40} strokeWidth={3} />
            企业查询
          </div>
          <p className="text-neutral-500 text-lg tracking-widest font-light">查企业 查老板 查关系</p>
        </motion.div>

        {/* Search Box Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full"
        >
          <SearchTabs
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
          <SearchInput
            query={query}
            onQueryChange={setQuery}
            onSearch={handleSearch}
            loading={loading && page === 1}
            placeholder="请输入企业名称、人名、品牌、统一社会信用代码等关键词"
          />
        </motion.div>

        {/* Hot Search */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <HotSearch onHotSearchClick={handleHotSearchClick} />
        </motion.div>

        {/* Error Message */}
        {error && (
          <ErrorMessage
            message={error}
            onRetry={() => performSearch(query, page)}
          />
        )}

        {/* Search Results */}
        {hasSearched && (
          <SearchResults
            results={results}
            total={total}
            page={page}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            onImport={handleImport}
            importingId={importingId}
            loading={loading}
          />
        )}

        {/* Quick Links / Content Feed Placeholder */}
        {!hasSearched && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <QuickLinks links={quickLinks} />
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default EnterpriseSearch;
