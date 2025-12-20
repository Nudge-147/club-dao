import { useState, useEffect, useMemo } from "react";
import { Cloud, EnvironmentType } from "laf-client-sdk";
import { MapPin, Plus, Zap, User, Calendar, Search, Lock, Palette, Utensils, ShoppingBag, Home, LayoutGrid } from "lucide-react";

// --- 配置区域 ---
const cloud = new Cloud({
  baseUrl: "https://yqq4612qr7.bja.sealos.run", // ✅ 已改回你的 Sealos 地址
  getAccessToken: () => localStorage.getItem("access_token") || "",
  environment: EnvironmentType.H5,
});

// --- 数据类型 ---
interface Activity {
  _id: string;
  title: string;
  description: string;
  max_people: number;
  time: string;
  location: string;
  author: string;
  category: "约饭" | "拼单";
  created_at?: number;
  joined_users: string[];
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
  
  const [currentTheme, setCurrentTheme] = useState<ThemeKey>("warm");
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<string>("");
  const [showLoginModal, setShowLoginModal] = useState<boolean>(true);
  const [loginName, setLoginName] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginStep, setLoginStep] = useState<"inputName" | "inputPassword" | "createAccount">("inputName");
  const [loginError, setLoginError] = useState("");

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
    return activities.filter(a => a.author === currentUser || (a.joined_users || []).includes(currentUser)).length;
  }, [activities, currentUser]);

  const squareList = useMemo(() => {
    return activities.filter(activity => {
      const matchSearch = activity.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = activeCategory === "全部" || activity.category === activeCategory;
      return matchSearch && matchCategory;
    });
  }, [activities, searchTerm, activeCategory]);

  const myActivities = useMemo(() => {
    return activities.filter(a => 
      a.author === currentUser || (a.joined_users || []).includes(currentUser)
    );
  }, [activities, currentUser]);

  const handleSetTheme = (theme: ThemeKey) => {
    if (theme === "nju" && userActivityCount < 10) {
      alert(`🔒 解锁需要 10 次成就。\n当前进度：${userActivityCount}/10`);
      return;
    }
    setCurrentTheme(theme);
    localStorage.setItem("club_theme", theme);
    setShowThemeModal(false);
  };

  // 🤝 加入活动
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

  // 👋 [新增] 退出活动
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

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsLoading(true);
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const rawTime = formData.get('time') as string;
    const dateObj = new Date(rawTime);
    const displayTime = dateObj.toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' });
    
    const newActivity = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      category: formData.get('category'),
      max_people: parseInt(formData.get('max_people') as string) || 5,
      time: displayTime, 
      location: formData.get('location') as string,
      author: currentUser,
      created_at: Date.now(),
      joined_users: [currentUser]
    };
    const res = await cloud.invoke("create-activity", newActivity);
    if (res && res.id) { setShowCreateModal(false); fetchActivities(); }
    else { alert("发布失败"); }
    setIsLoading(false);
  };

  const checkUsername = async (e: React.FormEvent) => { e.preventDefault(); if(!loginName.trim())return; setIsLoading(true); setLoginError(""); try{const res=await cloud.invoke("user-ops",{type:'check',username:loginName.trim()});if(res&&res.exists)setLoginStep("inputPassword");else setLoginStep("createAccount");}catch(e){setLoginError("连接失败")}finally{setIsLoading(false);} };
  const handleLogin = async (e: React.FormEvent) => { e.preventDefault(); setIsLoading(true); const res=await cloud.invoke("user-ops",{type:'login',username:loginName.trim(),password:loginPassword});if(res&&res.ok){localStorage.setItem("club_username",loginName.trim());setCurrentUser(loginName.trim());setShowLoginModal(false);}else{setLoginError(res.msg||"密码错误");setIsLoading(false);} };
  const handleRegister = async (e: React.FormEvent) => { e.preventDefault(); setIsLoading(true); const res=await cloud.invoke("user-ops",{type:'register',username:loginName.trim(),password:loginPassword});if(res&&res.ok){localStorage.setItem("club_username",loginName.trim());setCurrentUser(loginName.trim());setShowLoginModal(false);}else{setLoginError(res.msg||"注册失败");setIsLoading(false);} };
  const handleLogout = () => { localStorage.removeItem("club_username"); setCurrentUser(""); setShowLoginModal(true); setLoginStep("inputName"); };
  
  const theme = THEMES[currentTheme];

  const ActivityCard = ({ activity, showJoinBtn = true }: { activity: Activity, showJoinBtn?: boolean }) => {
    const joined = activity.joined_users || [];
    const isJoined = joined.includes(currentUser);
    const isFull = joined.length >= activity.max_people;
    
    // 🔘 按钮状态机：根据不同情况显示不同按钮
    let btnConfig = { 
      text: "Join", 
      disabled: false, 
      style: `${theme.primary} text-white shadow-md active:scale-95`,
      onClick: () => handleJoin(activity._id)
    };

    if (isJoined) {
      // ✅ 如果已加入 -> 变身红色退出按钮
      btnConfig = { 
        text: "退出", 
        disabled: false, 
        style: "bg-red-50 text-red-500 border border-red-100 hover:bg-red-100 active:scale-95",
        onClick: () => handleQuit(activity._id)
      };
    } else if (isFull) {
      // 🈵 如果满员 -> 灰色不可点
      btnConfig = { 
        text: "已满员", 
        disabled: true, 
        style: "bg-gray-200 text-gray-400 cursor-not-allowed",
        onClick: async () => {}
      };
    }

    return (
      <div className={`${theme.card} rounded-[2rem] p-6 shadow-sm border ${theme.border} mb-4 transition-all hover:shadow-md`}>
        <div className="flex justify-between items-start mb-3">
          <div className="flex gap-2 items-center mb-1">
             <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${activity.category === '约饭' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>{activity.category || "约饭"}</span>
          </div>
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 ${theme.badge}`}>
            <User size={12} /> {joined.length} / {activity.max_people}
          </span>
        </div>
        <h3 className="font-bold text-xl mb-2">{activity.title}</h3>
        <p className="text-gray-500 mb-6 text-sm leading-relaxed">{activity.description}</p>
        <div className="flex flex-col gap-3">
            <div className={`flex items-center gap-2 text-sm font-bold ${theme.icon}`}><Calendar size={14}/> {activity.time}</div>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-400 font-bold"><MapPin size={14}/> {activity.location}</div>
                {showJoinBtn && (
                  <button 
                    onClick={btnConfig.onClick} 
                    disabled={btnConfig.disabled} 
                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${btnConfig.style}`}
                  >
                    {btnConfig.text}
                  </button>
                )}
            </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen font-sans text-slate-900 pb-32 transition-colors duration-500 ${theme.bg}`}>
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-sm text-center">
             <h2 className="text-3xl font-black mb-1">ClubDAO</h2>
             <p className="text-xs text-gray-500 font-bold mb-8 leading-relaxed">南京大学区块链+AI<br/>与金融创新俱乐部 联合开发</p>
             {loginStep==="inputName"&&<form onSubmit={checkUsername}><input value={loginName} onChange={e=>setLoginName(e.target.value)} placeholder="你的代号" className="w-full p-4 bg-slate-100 rounded-xl mb-4 text-center font-bold outline-none"/><button className="w-full bg-black text-white p-4 rounded-xl font-bold">下一步</button></form>}
             {loginStep==="inputPassword"&&<form onSubmit={handleLogin}><div className="font-bold text-xl mb-4">{loginName}</div><input type="password" value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} placeholder="口令" className="w-full p-4 bg-slate-100 rounded-xl mb-4 text-center font-bold outline-none"/><button className="w-full bg-black text-white p-4 rounded-xl font-bold">登录</button></form>}
             {loginStep==="createAccount"&&<form onSubmit={handleRegister}><div className="text-green-600 font-bold mb-4">🎉 新人请设置口令</div><input value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} placeholder="设置口令" className="w-full p-4 bg-slate-100 rounded-xl mb-4 text-center font-bold outline-none"/><button className="w-full bg-black text-white p-4 rounded-xl font-bold">注册</button></form>}
             {loginError&&<p className="text-red-500 mt-2 font-bold">{loginError}</p>}
          </div>
        </div>
      )}

      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg transition-colors duration-500 ${theme.primary}`}>C</div>
          <span className={`font-bold text-xl ${theme.primaryText}`}>{activeTab === 'square' ? 'ClubDAO' : '我的档案'}</span>
        </div>
        <div className="flex items-center gap-3">
           <button onClick={() => setShowThemeModal(true)} className="bg-black text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all mr-1"><Palette size={14}/></button>
           <div className="bg-white border px-3 py-1.5 rounded-full font-bold text-sm flex items-center gap-2 shadow-sm">
             <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white ${theme.accent}`}><User size={14}/></div>
             {currentUser}
           </div>
           {currentUser && <button onClick={handleLogout} className="text-xs text-gray-400 font-bold ml-1">✕</button>}
        </div>
      </nav>

      <main className="p-6 max-w-md mx-auto space-y-6">
        {activeTab === 'square' && (
          <div className="animate-fade-in space-y-6">
            <div className="relative group">
              <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
              <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="寻找下一场活动..." className="w-full bg-white pl-12 pr-4 py-3 rounded-2xl font-bold outline-none shadow-sm focus:ring-2 focus:ring-black/5" />
            </div>
            <div className="flex p-1.5 bg-white rounded-2xl shadow-sm gap-1">
              {(["全部", "约饭", "拼单"] as const).map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${activeCategory === cat ? `${theme.primary} text-white shadow-md` : "text-gray-400 hover:bg-gray-50"}`}>{cat}</button>
              ))}
            </div>
            <div>
              {squareList.length === 0 && !isLoading && <div className="text-center py-12 text-gray-300 font-bold">暂无活动</div>}
              {squareList.map(activity => <ActivityCard key={activity._id} activity={activity} />)}
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="animate-fade-in space-y-6">
            <div className={`rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden text-white transition-colors duration-500 ${theme.primary}`}>
              <div className="relative z-10">
                <h1 className="text-lg opacity-80 mb-1">My Journey</h1>
                <p className="text-5xl font-bold tracking-tight">{userActivityCount} <span className="text-lg opacity-60">次参与</span></p>
                {userActivityCount < 10 ? <p className="text-xs mt-2 opacity-70">🔒 再参加 {10 - userActivityCount} 次解锁南大紫皮肤</p> : <p className="text-xs mt-2 font-bold text-yellow-300">👑 已解锁南大紫尊贵权益</p>}
              </div>
              <Zap className="absolute right-[-20px] top-[-20px] opacity-20 rotate-12" size={160} />
            </div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-2">My History</h3>
            <div>
              {myActivities.length === 0 && <div className="text-center py-12 text-gray-300 font-bold">你还没有参加过任何活动</div>}
              {myActivities.map(activity => <ActivityCard key={activity._id} activity={activity} showJoinBtn={true} />)}
            </div>
            <div className="mt-12 mb-8 text-center opacity-40">
              <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4"></div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1">Jointly Developed by</p>
              <p className="text-xs font-bold">南京大学区块链+AI<br/>与金融创新俱乐部</p>
            </div>
          </div>
        )}
      </main>

      {activeTab === 'square' && (
        <button onClick={() => setShowCreateModal(true)} className={`fixed bottom-24 right-6 w-14 h-14 text-white rounded-[1.2rem] flex items-center justify-center shadow-2xl transition-all hover:scale-110 active:scale-90 z-30 ${theme.primary}`}>
          <Plus size={28} />
        </button>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-gray-100 pb-safe pt-2 px-6 flex justify-around items-center z-50 h-20">
        <button onClick={() => setActiveTab('square')} className={`flex flex-col items-center gap-1 w-16 transition-colors ${activeTab === 'square' ? theme.navActive : theme.navInactive}`}>
          <Home size={24} strokeWidth={activeTab === 'square' ? 3 : 2} />
          <span className="text-[10px] font-bold">广场</span>
        </button>
        <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1 w-16 transition-colors ${activeTab === 'profile' ? theme.navActive : theme.navInactive}`}>
          <LayoutGrid size={24} strokeWidth={activeTab === 'profile' ? 3 : 2} />
          <span className="text-[10px] font-bold">我的</span>
        </button>
      </div>

      {showThemeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 animate-slide-up">
            <h3 className="text-xl font-black mb-6 text-center">选择界面风格</h3>
            <div className="grid grid-cols-3 gap-4">
              <button onClick={() => handleSetTheme("warm")} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 ${currentTheme==='warm'?'border-orange-500 bg-orange-50':'border-transparent bg-gray-50'}`}>
                <div className="w-8 h-8 rounded-full bg-orange-500 shadow-md"></div><span className="text-xs font-bold">暖阳橙</span>
              </button>
              <button onClick={() => handleSetTheme("cool")} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 ${currentTheme==='cool'?'border-blue-500 bg-blue-50':'border-transparent bg-gray-50'}`}>
                <div className="w-8 h-8 rounded-full bg-blue-500 shadow-md"></div><span className="text-xs font-bold">清凉蓝</span>
              </button>
              <button onClick={() => handleSetTheme("nju")} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 ${currentTheme==='nju'?'border-purple-800 bg-purple-50':'border-transparent bg-gray-50'} relative overflow-hidden`}>
                <div className="w-8 h-8 rounded-full bg-[#6A005F] shadow-md flex items-center justify-center">{userActivityCount < 10 && <Lock size={14} className="text-white/50"/>}</div><span className="text-xs font-bold text-[#6A005F]">南大紫</span>
              </button>
            </div>
            <button onClick={() => setShowThemeModal(false)} className="w-full mt-6 py-3 bg-gray-100 rounded-xl font-bold text-gray-500">关闭</button>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-white/95 backdrop-blur-xl z-50 p-6 flex flex-col">
           <div className="flex justify-between items-center mb-6 pt-4">
             <h2 className="text-3xl font-black">发布活动</h2>
             <button onClick={() => setShowCreateModal(false)} className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-400">✕</button>
           </div>
           <form onSubmit={handleCreateActivity} className="flex-1 space-y-6 overflow-y-auto pb-20">
             <div className="space-y-2"><label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">分类板块</label><div className="flex gap-4"><label className="flex-1 cursor-pointer"><input type="radio" name="category" value="约饭" defaultChecked className="peer hidden" /><div className="bg-gray-100 peer-checked:bg-orange-500 peer-checked:text-white py-3 rounded-xl text-center font-bold flex items-center justify-center gap-2 transition-all"><Utensils size={16}/> 约饭</div></label><label className="flex-1 cursor-pointer"><input type="radio" name="category" value="拼单" className="peer hidden" /><div className="bg-gray-100 peer-checked:bg-blue-600 peer-checked:text-white py-3 rounded-xl text-center font-bold flex items-center justify-center gap-2 transition-all"><ShoppingBag size={16}/> 拼单</div></label></div></div>
             <div className="space-y-2"><label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">标题</label><input name="title" required className="w-full text-2xl font-bold border-b-2 border-gray-100 py-3 outline-none bg-transparent" /></div>
             <div className="space-y-2"><label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">时间</label><input type="datetime-local" name="time" required className="w-full bg-gray-50 rounded-2xl p-4 font-bold outline-none" /></div>
             <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">地点</label><input name="location" required className="w-full bg-gray-50 rounded-2xl p-4 font-bold outline-none" /></div><div className="space-y-2"><label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">最大人数</label><input type="number" name="max_people" placeholder="5" className="w-full bg-gray-50 rounded-2xl p-4 font-bold outline-none text-center" /></div></div>
             <div className="space-y-2"><label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">详情</label><textarea name="description" required className="w-full bg-gray-50 rounded-2xl p-4 h-32 resize-none outline-none font-medium" /></div>
             <button disabled={isLoading} type="submit" className={`w-full text-white py-5 rounded-2xl font-bold text-xl shadow-xl mt-8 ${theme.primary}`}>{isLoading ? "发布中..." : "即刻发布"}</button>
           </form>
        </div>
      )}
    </div>
  );
}

export default App;
