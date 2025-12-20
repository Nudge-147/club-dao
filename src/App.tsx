import { useState, useEffect, useMemo } from "react";
import { Cloud, EnvironmentType } from "laf-client-sdk";
import { MapPin, Plus, Zap, User, Calendar, Search, Lock, Palette, Utensils, ShoppingBag, Home, LayoutGrid, ChevronDown, ChevronUp, Trash2, Eraser, Eye, EyeOff, X } from "lucide-react";

// --- 配置区域 ---
const cloud = new Cloud({
  baseUrl: "https://yqq4612qr7.bja.sealos.run", 
  getAccessToken: () => localStorage.getItem("access_token") || "",
  environment: EnvironmentType.H5,
});

// --- 数据类型 ---
interface Activity {
  _id: string;
  title: string;
  description: string;
  max_people: number;
  min_people?: number;
  time: string;
  location: string;
  author: string;
  category: "约饭" | "拼单";
  created_at?: number;
  joined_users: string[];
  hidden_by?: string[]; 
  status?: 'active' | 'deleted';
}

// --- 皮肤配置 ---
const THEMES = {
  warm: {
    name: "暖阳橙",
    bg: "bg-[#FFF8F0]",
    card: "bg-white",
    primary: "bg-orange-500",
    primaryText: "text-orange-500",
    accent: "bg-yellow-400",
    icon: "text-orange-600",
    border: "border-orange-100",
    badge: "bg-orange-50 text-orange-600",
    navActive: "text-orange-600",
    navInactive: "text-gray-300"
  },
  cool: {
    name: "清凉蓝",
    bg: "bg-[#F0F8FF]",
    card: "bg-white",
    primary: "bg-blue-600",
    primaryText: "text-blue-600",
    accent: "bg-cyan-400",
    icon: "text-blue-600",
    border: "border-blue-100",
    badge: "bg-blue-50 text-blue-600",
    navActive: "text-blue-600",
    navInactive: "text-gray-300"
  },
  nju: {
    name: "南大紫",
    bg: "bg-[#F3E5F5]",
    card: "bg-white/90",
    primary: "bg-[#6A005F]",
    primaryText: "text-[#6A005F]",
    accent: "bg-purple-400",
    icon: "text-[#6A005F]",
    border: "border-purple-200",
    badge: "bg-purple-100 text-purple-800",
    navActive: "text-[#6A005F]",
    navInactive: "text-gray-400"
  }
};

type ThemeKey = keyof typeof THEMES;

function App() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activeTab, setActiveTab] = useState<"square" | "profile">("square");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<"全部" | "约饭" | "拼单">("全部");
  const [showHiddenItems, setShowHiddenItems] = useState(false);

  const [currentTheme, setCurrentTheme] = useState<ThemeKey>("warm");
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<string>("");
  const [showLoginModal, setShowLoginModal] = useState<boolean>(true);
  const [loginName, setLoginName] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginStep, setLoginStep] = useState<"inputName" | "nameTaken" | "inputPassword" | "createAccount">("inputName");
  const [loginError, setLoginError] = useState("");

  const theme = THEMES[currentTheme];

  useEffect(() => {
    const savedName = localStorage.getItem("club_username");
    if (savedName) {
      setCurrentUser(savedName);
      setShowLoginModal(false);
    }
    const savedTheme = localStorage.getItem("club_theme") as ThemeKey;
    if (savedTheme && THEMES[savedTheme]) setCurrentTheme(savedTheme);
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const res = await cloud.invoke("get-activities");
      if (res) setActivities(res);
    } catch (err) { console.error(err); }
  };

  const userActivityCount = useMemo(() => {
    if (!currentUser) return 0;
    return activities.filter(a => (a.author === currentUser || (a.joined_users || []).includes(currentUser)) && a.status !== 'deleted').length;
  }, [activities, currentUser]);

  const isExpired = (activity: Activity) => {
    if (!activity.time) return false;
    const now = Date.now();
    const created = activity.created_at || now;
    return (now - created) > (5 * 24 * 60 * 60 * 1000); 
  };

  const squareList = useMemo(() => {
    return activities.filter(activity => {
      const matchSearch = activity.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = activeCategory === "全部" || activity.category === activeCategory;
      const expired = isExpired(activity);
      const isHidden = (activity.hidden_by || []).includes(currentUser);
      const isDeleted = activity.status === 'deleted';

      return matchSearch && matchCategory && !expired && !isHidden && !isDeleted;
    });
  }, [activities, searchTerm, activeCategory, currentUser]);

  const myActivities = useMemo(() => {
    return activities.filter(a => {
      const isRelated = a.author === currentUser || (a.joined_users || []).includes(currentUser);
      const isHidden = (a.hidden_by || []).includes(currentUser);
      const isDeleted = a.status === 'deleted';
      
      if (!isRelated) return false;
      if (showHiddenItems) {
        return true; 
      } else {
        return !isHidden && !isDeleted; // 默认只显示正常的
      }
    });
  }, [activities, currentUser, showHiddenItems]);

  const handleSetTheme = (theme: ThemeKey) => {
    if (theme === "nju" && userActivityCount < 10) {
      alert(`🔒 解锁需要 10 次成就。\n当前进度：${userActivityCount}/10`);
      return;
    }
    setCurrentTheme(theme);
    localStorage.setItem("club_theme", theme);
    setShowThemeModal(false);
  };

  const handleJoin = async (activityId: string) => {
    if (!currentUser) { alert("请先登录"); return; }
    if (!window.confirm("确定加入？")) return;
    setIsLoading(true);
    try {
      const res = await cloud.invoke("join-activity", { activityId, username: currentUser });
      if (res.ok) { alert("加入成功！"); fetchActivities(); } 
      else { alert(res.msg); }
    } catch (e) { alert("网络错误"); } 
    finally { setIsLoading(false); }
  };

  const handleQuit = async (activityId: string) => {
    if (!window.confirm("确定要退出这个活动吗？😢")) return;
    setIsLoading(true);
    try {
      const res = await cloud.invoke("quit-activity", { activityId, username: currentUser });
      if (res.ok) { alert("已退出活动"); fetchActivities(); }
      else { alert(res.msg); }
    } catch (e) { alert("网络错误"); }
    finally { setIsLoading(false); }
  };

  const handleDelete = async (activityId: string) => {
    // 👑 发起者解散活动逻辑
    if (!window.confirm("⚠️ 确定要解散活动吗？\n所有成员将收到活动已取消的通知。")) return;
    setIsLoading(true);
    try {
      const res = await cloud.invoke("delete-activity", { activityId, username: currentUser });
      if (res.ok) { alert("活动已解散"); fetchActivities(); } else { alert(res.msg); }
    } catch (e) { alert("网络错误"); }
    finally { setIsLoading(false); }
  };

  const handleHardDelete = async (activityId: string) => {
    if (!window.confirm("☢️ 高能预警！\n此操作将【永久销毁】这条数据，无法找回。\n确定要继续吗？")) return;
    setIsLoading(true);
    try {
      const res = await cloud.invoke("hard-delete-activity", { activityId, username: currentUser });
      if (res.ok) { alert("数据已粉碎 👋"); fetchActivities(); } else { alert(res.msg); }
    } catch (e) { alert("网络错误"); }
    finally { setIsLoading(false); }
  };

  const handleHide = async (activityId: string) => {
    if (!window.confirm("🧹 确定要清除这条记录吗？\n(眼不见为净)")) return;
    setActivities(prev => prev.map(a => a._id === activityId ? { ...a, hidden_by: [...(a.hidden_by||[]), currentUser] } : a));
    try { await cloud.invoke("hide-activity", { activityId, username: currentUser }); } 
    catch (e) { console.error(e); fetchActivities(); }
  };

  const handleRestore = async (activityId: string) => {
    if (!window.confirm("🥰 要恢复这个活动吗？")) return;
    setIsLoading(true);
    try {
      const res = await cloud.invoke("restore-activity", { activityId, username: currentUser });
      if (res.ok) { alert("活动已恢复 ✨"); fetchActivities(); } else { alert("恢复失败"); }
    } catch (e) { alert("网络错误"); }
    finally { setIsLoading(false); }
  };

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const minVal = parseInt(formData.get('min_people') as string) || 2;
    const maxVal = parseInt(formData.get('max_people') as string) || 5;

    if (minVal < 2) { alert("❌ 拼单约饭至少需要 2 个人哦！"); return; }
    if (maxVal < minVal) { alert(`❌ 最大人数 (${maxVal}) 不能少于最少人数 (${minVal})！`); return; }

    setIsLoading(true);
    const rawTime = formData.get('time') as string;
    const dateObj = new Date(rawTime);
    const displayTime = dateObj.toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' });
    
    const newActivity = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      category: formData.get('category'),
      max_people: maxVal,
      min_people: minVal,
      time: displayTime, 
      location: formData.get('location') as string,
      author: currentUser,
      created_at: Date.now(),
      joined_users: [currentUser],
      hidden_by: [],
      status: 'active'
    };
    const res = await cloud.invoke("create-activity", newActivity);
    if (res && res.id) { setShowCreateModal(false); fetchActivities(); }
    else { alert("发布失败"); }
    setIsLoading(false);
  };

  const checkUsername = async (e: React.FormEvent) => { e.preventDefault(); if(!loginName.trim())return; setIsLoading(true); setLoginError(""); try{const res=await cloud.invoke("user-ops",{type:'check',username:loginName.trim()});if(res&&res.exists)setLoginStep("nameTaken");else setLoginStep("createAccount");}catch(e){setLoginError("连接失败")}finally{setIsLoading(false);} };
  const handleLogin = async (e: React.FormEvent) => { e.preventDefault(); setIsLoading(true); const res=await cloud.invoke("user-ops",{type:'login',username:loginName.trim(),password:loginPassword});if(res&&res.ok){localStorage.setItem("club_username",loginName.trim());setCurrentUser(loginName.trim());setShowLoginModal(false);}else{setLoginError(res.msg||"密码错误");setIsLoading(false);} };
  const handleRegister = async (e: React.FormEvent) => { e.preventDefault(); setIsLoading(true); const res=await cloud.invoke("user-ops",{type:'register',username:loginName.trim(),password:loginPassword});if(res&&res.ok){localStorage.setItem("club_username",loginName.trim());setCurrentUser(loginName.trim());setShowLoginModal(false);}else{setLoginError(res.msg||"注册失败");setIsLoading(false);} };
  const handleLogout = () => { localStorage.removeItem("club_username"); setCurrentUser(""); setShowLoginModal(true); setLoginStep("inputName"); setLoginName(""); setLoginPassword(""); };
  const resetToInputName = () => { setLoginStep("inputName"); setLoginError(""); setLoginPassword(""); };

  const ActivityCard = ({ activity, showJoinBtn = true, showSweepBtn = false }: { activity: Activity, showJoinBtn?: boolean, showSweepBtn?: boolean }) => {
    const [expanded, setExpanded] = useState(false);
    
    const joined = activity.joined_users || [];
    const isJoined = joined.includes(currentUser);
    const isAuthor = activity.author === currentUser; 
    const isFull = joined.length >= activity.max_people;
    const minP = activity.min_people || 1;
    
    // 状态判定
    const isDeleted = activity.status === 'deleted'; // 🚫 作者已解散
    const isHidden = (activity.hidden_by || []).includes(currentUser); // 🧹 我已隐藏
    const expired = isExpired(activity); // ⌛ 已过期
    
    const isGhost = isDeleted || isHidden; // 处于回收站/隐藏状态

    // 🧹 是否可以清理？(条件：已过期 OR 已解散)
    const canSweep = expired || isDeleted;

    const content = activity.description || "暂无详情";
    const isLongText = content.length > 50;
    const displayContent = expanded ? content : content.slice(0, 50) + (isLongText ? "..." : "");

    let btnConfig = { 
      text: "Join", disabled: false, style: `${theme.primary} text-white shadow-md active:scale-95`, onClick: () => handleJoin(activity._id)
    };

    if (isGhost) {
       // 👻 回收站模式：主要是恢复
       btnConfig = { text: "↩️ 恢复活动", disabled: false, style: "bg-gray-800 text-white shadow-md active:scale-95", onClick: () => handleRestore(activity._id) };
    } else if (isDeleted) {
       // 🚫 已解散模式（对于非作者用户）
       btnConfig = { text: "🚫 已解散", disabled: true, style: "bg-red-50 text-red-500 cursor-not-allowed", onClick: async () => {} };
    } else if (isAuthor) {
      if (isFull) {
        btnConfig = { text: "🚀 全体就绪，发车！", disabled: false, style: "bg-green-500 text-white shadow-lg scale-105 font-black animate-pulse", onClick: async () => alert("好耶！人都齐了，快去联系大家吧！") };
      } else {
        btnConfig = { text: "等待加入...", disabled: true, style: "bg-gray-100 text-gray-400 cursor-default", onClick: async () => {} };
      }
    } else {
      if (isJoined) {
        btnConfig = { text: "退出", disabled: false, style: "bg-red-50 text-red-500 border border-red-100 hover:bg-red-100 active:scale-95", onClick: () => handleQuit(activity._id) };
      } else if (isFull) {
        btnConfig = { text: "已满员", disabled: true, style: "bg-gray-200 text-gray-400 cursor-not-allowed", onClick: async () => {} };
      }
    }

    return (
      <div className={`${theme.card} rounded-[2rem] p-6 shadow-sm border ${theme.border} mb-4 transition-all hover:shadow-md relative ${isGhost ? "opacity-60 grayscale border-dashed" : ""}`}>
        
        {/* 🗑️ 发起者：随时可以解散活动 (不管有没有人) */}
        {!isGhost && isAuthor && showJoinBtn && (
          <button 
            onClick={() => handleDelete(activity._id)} 
            className="absolute top-6 right-6 p-2 bg-gray-50 text-gray-400 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors"
            title="解散活动"
          >
            <Trash2 size={16} />
          </button>
        )}

        {/* 🧹 清理按钮：只有 (已过期 OR 已解散) 的活动才能清理 */}
        {!isGhost && showSweepBtn && canSweep && (
           <button onClick={() => handleHide(activity._id)} className="absolute top-6 right-6 p-2 bg-gray-50 text-gray-400 rounded-full hover:bg-slate-100 hover:text-black transition-colors" title="移除"><Eraser size={16} /></button>
        )}
        
        {/* 标签提示 */}
        {isGhost && (
          <div className="absolute top-6 right-6 px-3 py-1 bg-gray-200 text-gray-500 text-xs font-bold rounded-full">{isDeleted ? "已解散" : "已隐藏"}</div>
        )}
        {/* 如果没被删、没隐藏，但是过期了，且不是作者（作者有垃圾桶），显示已过期 */}
        {!isGhost && !isAuthor && expired && (
          <div className="absolute top-6 right-6 px-3 py-1 bg-gray-100 text-gray-400 text-xs font-bold rounded-full">已过期</div>
        )}

        <div className="flex justify-between items-start mb-3 pr-10">
          <div className="flex gap-2 items-center mb-1">
             <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${activity.category === '约饭' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>{activity.category || "约饭"}</span>
          </div>
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 ${theme.badge}`}>
            <User size={12} /> {joined.length} <span className="opacity-50 mx-1">/</span> {minP === 1 ? activity.max_people : `${minP}-${activity.max_people}`}人
          </span>
        </div>
        <h3 className="font-bold text-xl mb-2">{activity.title}</h3>
        <div className="mb-6 relative">
          <p onClick={() => isLongText && setExpanded(!expanded)} className={`text-gray-500 text-sm leading-relaxed whitespace-pre-wrap ${isLongText ? "cursor-pointer hover:text-gray-700" : ""}`}>{displayContent}</p>
          {isLongText && (
            <button onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }} className={`text-xs font-bold mt-1 flex items-center gap-1 ${theme.primaryText}`}>
              {expanded ? <><ChevronUp size={12}/> 收起</> : <><ChevronDown size={12}/> 查看更多</>}
            </button>
          )}
        </div>
        <div className="flex flex-col gap-3">
            <div className={`flex items-center gap-2 text-sm font-bold ${theme.icon}`}><Calendar size={14}/> {activity.time}</div>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-400 font-bold"><MapPin size={14}/> {activity.location}</div>
                {showJoinBtn && (
                  <button onClick={btnConfig.onClick} disabled={btnConfig.disabled} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${btnConfig.style}`}>{btnConfig.text}</button>
                )}
                {!showJoinBtn && (
                  <div className="flex gap-2 items-center">
                    {/* 👻 影子模式 (回收站) */}
                    {isGhost ? (
                      <>
                        <button onClick={btnConfig.onClick} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${btnConfig.style}`}>{btnConfig.text}</button>
                        {isAuthor && (
                          <button onClick={() => handleHardDelete(activity._id)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-100 text-red-500 hover:bg-red-200 transition-all flex items-center gap-1"><X size={14}/> 彻底删除</button>
                        )}
                      </>
                    ) : (
                      // 📜 档案列表模式
                      <>
                        {isDeleted ? (
                           <div className="text-xs font-bold text-red-400 flex items-center gap-1">🚫 活动已解散</div>
                        ) : (
                           <div className="text-xs font-bold text-gray-300">{expired ? "已过期" : "进行中"}</div>
                        )}
                        {/* 如果是正在进行的活动，允许退出 */}
                        {!expired && !isDeleted && isJoined && !isAuthor && (
                          <button onClick={() => handleQuit(activity._id)} className="px-4 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-500 border border-red-100 hover:bg-red-100">退出</button>
                        )}
                      </>
                    )}
                  </div>
                )}
            </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen font-sans text-slate-900 pb-32 transition-colors duration-500 ${theme.bg}`}>
      {/* ... (其他部分保持不变，省略以节省空间，上面的代码已经包含了完整的 ActivityCard 逻辑) ... */}
      {showLoginModal && (<div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"><div className="bg-white rounded-[2rem] p-8 w-full max-w-sm text-center relative animate-scale-in"><h2 className="text-3xl font-black mb-1">ClubDAO</h2><p className="text-xs text-gray-500 font-bold mb-8 leading-relaxed">南京大学区块链+AI<br/>与金融创新俱乐部 联合开发</p>{loginStep === "inputName" && (<form onSubmit={checkUsername}><input autoFocus value={loginName} onChange={e=>setLoginName(e.target.value)} placeholder="你的代号" className="w-full p-4 bg-slate-100 rounded-xl mb-4 text-center font-bold outline-none border-2 border-transparent focus:border-black transition-all"/><button className="w-full bg-black text-white p-4 rounded-xl font-bold shadow-lg active:scale-95 transition-all">下一步</button></form>)}{loginStep === "nameTaken" && (<div className="space-y-4"><div className="bg-orange-50 text-orange-600 p-4 rounded-xl font-bold text-sm border border-orange-100">⚠️ 昵称 "{loginName}" 已被使用</div><button onClick={() => setLoginStep("inputPassword")} className="w-full bg-black text-white p-4 rounded-xl font-bold shadow-lg active:scale-95 transition-all">是我，去登录</button><button onClick={resetToInputName} className="w-full bg-white text-gray-500 p-4 rounded-xl font-bold border-2 border-gray-100 hover:bg-gray-50 active:scale-95 transition-all">不是我，换个名字</button></div>)}{loginStep === "inputPassword" && (<form onSubmit={handleLogin}><div className="flex items-center justify-between mb-4 px-2"><button type="button" onClick={resetToInputName} className="text-xs font-bold text-gray-400 hover:text-black">← 修改账号</button><div className="font-bold text-xl">{loginName}</div><div className="w-10"></div></div><input autoFocus type="password" value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} placeholder="请输入口令" className="w-full p-4 bg-slate-100 rounded-xl mb-4 text-center font-bold outline-none border-2 border-transparent focus:border-black transition-all"/><button className="w-full bg-black text-white p-4 rounded-xl font-bold shadow-lg active:scale-95 transition-all">登录</button></form>)}{loginStep === "createAccount" && (<form onSubmit={handleRegister}><div className="flex items-center justify-between mb-4 px-2"><button type="button" onClick={resetToInputName} className="text-xs font-bold text-gray-400 hover:text-black">← 修改账号</button><div className="text-green-600 font-bold">🎉 欢迎新人</div><div className="w-10"></div></div><input autoFocus value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} placeholder="设置新口令" className="w-full p-4 bg-slate-100 rounded-xl mb-4 text-center font-bold outline-none border-2 border-transparent focus:border-black transition-all"/><button className="w-full bg-black text-white p-4 rounded-xl font-bold shadow-lg active:scale-95 transition-all">注册并登录</button></form>)}{loginError && <p className="text-red-500 mt-4 font-bold animate-pulse">{loginError}</p>}</div></div>)}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex justify-between items-center"><div className="flex items-center gap-2"><div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg transition-colors duration-500 ${theme.primary}`}>C</div><span className={`font-bold text-xl ${theme.primaryText}`}>{activeTab === 'square' ? 'ClubDAO' : '我的档案'}</span></div><div className="flex items-center gap-3"><button onClick={() => setShowThemeModal(true)} className="bg-black text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all mr-1"><Palette size={14}/></button><div className="bg-white border px-3 py-1.5 rounded-full font-bold text-sm flex items-center gap-2 shadow-sm"><div className={`w-6 h-6 rounded-full flex items-center justify-center text-white ${theme.accent}`}><User size={14}/></div>{currentUser}</div>{currentUser && <button onClick={handleLogout} className="text-xs text-gray-400 font-bold ml-1">✕</button>}</div></nav>
      <main className="p-6 max-w-md mx-auto space-y-6">
        {activeTab === 'square' && (<div className="animate-fade-in space-y-6"><div className="relative group"><Search className="absolute left-4 top-3.5 text-gray-400" size={20} /><input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="寻找下一场活动..." className="w-full bg-white pl-12 pr-4 py-3 rounded-2xl font-bold outline-none shadow-sm focus:ring-2 focus:ring-black/5" /></div><div className="flex p-1.5 bg-white rounded-2xl shadow-sm gap-1">{(["全部", "约饭", "拼单"] as const).map(cat => (<button key={cat} onClick={() => setActiveCategory(cat)} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${activeCategory === cat ? `${theme.primary} text-white shadow-md` : "text-gray-400 hover:bg-gray-50"}`}>{cat}</button>))}</div><div>{squareList.length === 0 && !isLoading && <div className="text-center py-12 text-gray-300 font-bold">暂无活动</div>}{squareList.map(activity => <ActivityCard key={activity._id} activity={activity} showJoinBtn={true} />)}</div></div>)}
        {activeTab === 'profile' && (<div className="animate-fade-in space-y-6"><div className={`rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden text-white transition-colors duration-500 ${theme.primary}`}><div className="relative z-10"><h1 className="text-lg opacity-80 mb-1">My Journey</h1><p className="text-5xl font-bold tracking-tight">{userActivityCount} <span className="text-lg opacity-60">次参与</span></p>{userActivityCount < 10 ? <p className="text-xs mt-2 opacity-70">🔒 再参加 {10 - userActivityCount} 次解锁南大紫皮肤</p> : <p className="text-xs mt-2 font-bold text-yellow-300">👑 已解锁南大紫尊贵权益</p>}</div><Zap className="absolute right-[-20px] top-[-20px] opacity-20 rotate-12" size={160} /></div><div className="flex justify-between items-end pl-2 pr-2"><h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">My History</h3><button onClick={() => setShowHiddenItems(!showHiddenItems)} className={`text-xs font-bold flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all ${showHiddenItems ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-400"}`}>{showHiddenItems ? <><Eye size={12}/> 隐藏已删除</> : <><EyeOff size={12}/> 显示已删除</>}</button></div><div>{myActivities.length === 0 && <div className="text-center py-12 text-gray-300 font-bold">干净得像一张白纸</div>}{myActivities.map(activity => <ActivityCard key={activity._id} activity={activity} showJoinBtn={false} showSweepBtn={true} />)}</div><div className="mt-12 mb-8 text-center opacity-40"><div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4"></div><p className="text-[10px] font-bold uppercase tracking-widest mb-1">Jointly Developed by</p><p className="text-xs font-bold">南京大学区块链+AI<br/>与金融创新俱乐部</p></div></div>)}
      </main>
      {activeTab === 'square' && (<button onClick={() => setShowCreateModal(true)} className={`fixed bottom-24 right-6 w-14 h-14 text-white rounded-[1.2rem] flex items-center justify-center shadow-2xl transition-all hover:scale-110 active:scale-90 z-30 ${theme.primary}`}><Plus size={28} /></button>)}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-gray-100 pb-safe pt-2 px-6 flex justify-around items-center z-50 h-20"><button onClick={() => setActiveTab('square')} className={`flex flex-col items-center gap-1 w-16 transition-colors ${activeTab === 'square' ? theme.navActive : theme.navInactive}`}><Home size={24} strokeWidth={activeTab === 'square' ? 3 : 2} /><span className="text-[10px] font-bold">广场</span></button><button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1 w-16 transition-colors ${activeTab === 'profile' ? theme.navActive : theme.navInactive}`}><LayoutGrid size={24} strokeWidth={activeTab === 'profile' ? 3 : 2} /><span className="text-[10px] font-bold">我的</span></button></div>
      {showThemeModal && (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"><div className="bg-white w-full max-w-sm rounded-3xl p-6 animate-slide-up"><h3 className="text-xl font-black mb-6 text-center">选择界面风格</h3><div className="grid grid-cols-3 gap-4"><button onClick={() => handleSetTheme("warm")} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 ${currentTheme==='warm'?'border-orange-500 bg-orange-50':'border-transparent bg-gray-50'}`}><div className="w-8 h-8 rounded-full bg-orange-500 shadow-md"></div><span className="text-xs font-bold">暖阳橙</span></button><button onClick={() => handleSetTheme("cool")} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 ${currentTheme==='cool'?'border-blue-500 bg-blue-50':'border-transparent bg-gray-50'}`}><div className="w-8 h-8 rounded-full bg-blue-500 shadow-md"></div><span className="text-xs font-bold">清凉蓝</span></button><button onClick={() => handleSetTheme("nju")} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 ${currentTheme==='nju'?'border-purple-800 bg-purple-50':'border-transparent bg-gray-50'} relative overflow-hidden`}><div className="w-8 h-8 rounded-full bg-[#6A005F] shadow-md flex items-center justify-center">{userActivityCount < 10 && <Lock size={14} className="text-white/50"/>}</div><span className="text-xs font-bold text-[#6A005F]">南大紫</span></button></div><button onClick={() => setShowThemeModal(false)} className="w-full mt-6 py-3 bg-gray-100 rounded-xl font-bold text-gray-500">关闭</button></div></div>)}
      {showCreateModal && (<div className="fixed inset-0 bg-white/95 backdrop-blur-xl z-50 p-6 flex flex-col"><div className="flex justify-between items-center mb-6 pt-4"><h2 className="text-3xl font-black">发布活动</h2><button onClick={() => setShowCreateModal(false)} className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-400">✕</button></div><form onSubmit={handleCreateActivity} className="flex-1 space-y-6 overflow-y-auto pb-20"><div className="space-y-2"><label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">分类板块</label><div className="flex gap-4"><label className="flex-1 cursor-pointer"><input type="radio" name="category" value="约饭" defaultChecked className="peer hidden" /><div className="bg-gray-100 peer-checked:bg-orange-500 peer-checked:text-white py-3 rounded-xl text-center font-bold flex items-center justify-center gap-2 transition-all"><Utensils size={16}/> 约饭</div></label><label className="flex-1 cursor-pointer"><input type="radio" name="category" value="拼单" className="peer hidden" /><div className="bg-gray-100 peer-checked:bg-blue-600 peer-checked:text-white py-3 rounded-xl text-center font-bold flex items-center justify-center gap-2 transition-all"><ShoppingBag size={16}/> 拼单</div></label></div></div><div className="space-y-2"><label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">标题</label><input name="title" required className="w-full text-2xl font-bold border-b-2 border-gray-100 py-3 outline-none bg-transparent" placeholder="例如：周末火锅局" /></div><div className="space-y-2"><label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">时间</label><input type="datetime-local" name="time" required className="w-full bg-gray-50 rounded-2xl p-4 font-bold outline-none" /></div><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">地点</label><input name="location" required className="w-full bg-gray-50 rounded-2xl p-4 font-bold outline-none" /></div></div><div className="space-y-2"><label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">人数限制</label><div className="flex gap-4 items-center"><div className="flex-1 bg-gray-50 rounded-2xl p-4 flex items-center gap-2"><span className="text-xs text-gray-400 font-bold whitespace-nowrap">最少</span><input type="number" name="min_people" placeholder="2" min="2" className="w-full bg-transparent font-bold outline-none text-center" /></div><span className="text-gray-300 font-bold">-</span><div className="flex-1 bg-gray-50 rounded-2xl p-4 flex items-center gap-2"><span className="text-xs text-gray-400 font-bold whitespace-nowrap">最多</span><input type="number" name="max_people" placeholder="5" min="2" className="w-full bg-transparent font-bold outline-none text-center" /></div></div></div><div className="space-y-2"><label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">详情 (选填)</label><textarea name="description" placeholder="可以在这里填写：&#10;• 成员年级要求&#10;• 成员性别要求&#10;• 兴趣爱好/口味偏好&#10;• 活动具体流程..." className="w-full bg-gray-50 rounded-2xl p-4 h-40 resize-none outline-none font-medium text-sm leading-relaxed placeholder:text-gray-300" /></div><button disabled={isLoading} type="submit" className={`w-full text-white py-5 rounded-2xl font-bold text-xl shadow-xl mt-8 ${theme.primary}`}>{isLoading ? "发布中..." : "即刻发布"}</button></form></div>)}
    </div>
  );
}

export default App;