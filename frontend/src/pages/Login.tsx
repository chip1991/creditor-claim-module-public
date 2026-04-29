import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const Login: React.FC = () => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(
        `/api/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
      );

      if (response.data && response.data.code === 200) {
        localStorage.setItem('satoken', response.data.token);
        navigate('/');
      } else {
        setError(response.data?.msg || '登录失败，请检查账号密码');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.response?.data?.msg || '网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-white font-sans overflow-hidden">
      {/* Left: Image Hero */}
      <div className="hidden lg:block lg:w-1/2 xl:w-[55%] relative bg-neutral-100">
        <motion.img 
          initial={{ scale: 1.05, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          src="https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Minimalist%20modern%20abstract%20architecture%20with%20soft%20natural%20light%2C%20calm%20neutral%20tones%2C%20premium%20editorial%20photography&image_size=landscape_16_9" 
          alt="Evertro Architecture"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/15" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        
        <div className="absolute bottom-12 left-12 text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
          >
            <div className="w-10 h-10 bg-white text-neutral-900 flex items-center justify-center mb-6">
              <span className="font-bold text-lg leading-none">Y</span>
            </div>
            <h2 className="text-4xl font-light tracking-tight mb-3">盈绰服务云</h2>
            <p className="text-white/80 font-light text-[15px] max-w-md leading-relaxed">
              企业级破产监控与台账管理平台。为精准而设计，为规模而构建。
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right: Login Form */}
      <div className="w-full lg:w-1/2 xl:w-[45%] flex flex-col justify-center px-8 sm:px-16 xl:px-24 bg-white relative z-10">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-full max-w-sm mx-auto"
        >
          <div className="mb-12">
            <h1 className="text-3xl font-medium tracking-tight text-neutral-900 mb-2">
              欢迎回来
            </h1>
            <p className="text-neutral-500 text-[14px]">
              请输入您的凭据以访问系统。
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="space-y-1.5"
            >
              <label htmlFor="username" className="block text-[13px] font-medium text-neutral-700">
                用户名
              </label>
              <input
                id="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="block w-full px-4 py-3.5 bg-neutral-50/50 border border-neutral-200/80 focus:bg-white focus:border-neutral-400 focus:ring-0 sm:text-[13px] transition-colors placeholder-neutral-400 outline-none"
                placeholder="admin"
              />
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-[13px] font-medium text-neutral-700">
                  密码
                </label>
              </div>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full px-4 py-3.5 bg-neutral-50/50 border border-neutral-200/80 focus:bg-white focus:border-neutral-400 focus:ring-0 sm:text-[13px] transition-colors placeholder-neutral-400 outline-none"
                placeholder="••••••••"
              />
            </motion.div>

            {error && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-500 text-[13px] font-medium"
              >
                {error}
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="pt-2"
            >
              <button
                type="submit"
                disabled={loading}
                className={`group w-full flex justify-between items-center py-3.5 px-5 border border-transparent text-[14px] font-medium text-white bg-neutral-900 hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-900 transition-all ${
                  loading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                <span>{loading ? '正在登录...' : '登录'}</span>
                <ArrowRight size={16} className="text-white/70 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </button>
            </motion.div>
          </form>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="mt-12 text-[12px] text-neutral-400"
          >
            登录即代表您同意我们的
            <Link to="/legal#terms" target="_blank" className="text-neutral-500 hover:text-neutral-900 underline underline-offset-2 transition-colors mx-1">
              服务条款
            </Link>
            与
            <Link to="/legal#privacy" target="_blank" className="text-neutral-500 hover:text-neutral-900 underline underline-offset-2 transition-colors mx-1">
              隐私政策
            </Link>
            。
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;