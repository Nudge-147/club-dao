import { useState, useEffect, useMemo } from "react";
import { Cloud, EnvironmentType } from "laf-client-sdk";
import { MapPin, Plus, Zap, User, Calendar, Search, Lock, Palette, Utensils, ShoppingBag, Home, LayoutGrid, Trash2, Eraser, Eye, EyeOff, LogOut, Shield, ShieldCheck, Mail, Edit3, Save } from "lucide-react";

// --- 配置区域 ---
const cloud = new Cloud({
  baseUrl: "https://yqq4612qr7.bja.sealos.run", 
  getAccessToken: () => localStorage.getItem("access_token") || "",
  environment: EnvironmentType.H5,
});

// --- 数据类型 ---
interface UserProfile {
  gender?: "男" | "女" | "保密";
  grade?: string; // 本科大一...
  city?: string;
  hobbies?: string;
  intro?: string;
}

interface UserData {
  _id: string;
  username: string;
  is_verified?: boolean;
  edu_email?: string;
  profile?: UserProfile;
}

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
  status?: 'active' | 'deleted' | 'completed';
  requires_verification?: boolean; // 🆕 新增字段
}

// --- 皮肤配置 ---
const THEMES = {
  warm: { name: "暖阳橙", bg: "bg-[#FFF8F0]", card: "bg-white", primary: "bg-orange-500", primaryText: "text-orange-500", accent: "bg-yellow-400", icon: "text-orange-600", border: "border-orange-100", badge: "bg-orange-50 text-orange-600", navActive: "text-orange-600", navInactive: "text-gray-300" },
  cool: { name: "清凉蓝", bg: "bg-[#F0F8FF]", card: "bg-white", primary: "bg-blue-600", primaryText: "text-blue-600", accent: "bg-cyan-400", icon: "text-blue-600", border: "border-blue-100", badge: "bg-blue-50 text-blue-600", navActive: "text-blue-600", navInactive: "text-gray-300" },
  nju: { name: "南大紫", bg: "bg-[#F3E5F5]", card: "bg-white/90", primary: "bg-[#6A005F]", primaryText: "text-[#6A005F]", accent: "bg-purple-400", icon: "text-[#6A005F]", border: "border-purple-200", badge: "bg-purple-100 text-purple-800", navActive: "text-[#6A005F]", navInactive: "text-gray-400" }
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
  const [inputTimeStr, setInputTimeStr] = useState("");

  // 用户数据
  const [currentUser, setCurrentUser] = useState<string>("");
  const [userData, setUserData] = useState<UserData | null>(null);

  // 认证与档案相关状态
  const [verifyEmail, setVerifyEmail] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [tempProfile, setTempProfile] = useState<UserProfile>({});

  // --- 时间选择器逻辑 ---
  const [dateState, setDateState] = useState(() => {
    const tmr = new Date(); tmr.setDate(tmr.getDate() + 1); 
    return { year: tmr.getFullYear(), month: tmr.getMonth() + 1, day: tmr.getDate(), hour: 0, minute: 0 };
  });

  useEffect(() => {
    const { year, month, day, hour, minute } = dateState;
    const f = (n: number) => n.toString().padStart(2, '0'); 
    setInputTimeStr(`${year}/${f(month)}/${f(day)} ${f(hour)}:${f(minute)}`);
  }, [dateState]);

  useEffect(() => {
    if (showCreateModal) {
      const tmr = new Date(); tmr.setDate(tmr.getDate() + 1);
      setDateState({ year: tmr.getFullYear(), month: tmr.getMonth() + 1, day: tmr.getDate(), hour: 0, minute: 0 });
    }
  }, [showCreateModal]);

  const getDaysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate();
  const handleDateChange = (key: keyof typeof dateState, val: string) => {
    const numVal = parseInt(val);
    setDateState(prev => {
      const next = { ...prev, [key]: numVal };
      if (key === 'year' || key === 'month') {
        const maxDays = getDaysInMonth(next.year, next.month);
        if (next.day > maxDays) next.day = maxDays;
      }
      return next;
    });
  };
  const range = (start: number, end: number) => Array.from({ length: end - start + 1 }, (_, i) => start + i);

  // 主题与登录
  const [currentTheme, setCurrentTheme] = useState<ThemeKey>("warm");
  const [showThemeModal, setShowThemeModal] = useState(false);
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
      fetchUserData(savedName); // 获取用户详细信息
    }
    const savedTheme = localStorage.getItem("club_theme") as ThemeKey;
    if (savedTheme && THEMES[savedTheme]) setCurrentTheme(savedTheme);
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try { const res = await cloud.invoke("get-activities"); if (res) setActivities(res); } catch (err) { console.error(err); }
  };

  const fetchUserData = async (username: string) => {
    try {
      const res = await cloud.invoke("user-ops", { type: 'get-info', username });
      if (res) {
        setUserData(res);
        setTempProfile(res.profile || {});
      }
    } catch (e) { console.error(e); }
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
      return showHiddenItems ? true : (!isHidden && !isDeleted);
    });
  }, [activities, currentUser, showHiddenItems]);

  const handleSetTheme = (theme: ThemeKey) => {
    if (theme === "nju" && userActivityCount < 10) { alert(`🔒 解锁需要 10 次成就。\n当前进度：${userActivityCount}/10`); return; }
    setCurrentTheme(theme); localStorage.setItem("club_theme", theme); setShowThemeModal(false);
  };

  const handleJoin = async (activityId: string) => {
    if (!currentUser) { alert("请先登录"); return; }
    if (!window.confirm("确定加入？")) return;
    setIsLoading(true);
    try {
      const res = await cloud.invoke("join-activity", { activityId, username: currentUser });
      if (res.ok) { alert("加入成功！"); fetchActivities(); } else { alert(res.msg); }
    } catch (e) { alert("网络错误"); } finally { setIsLoading(false); }
  };

  const handleQuit = async (activityId: string) => {
    if (!window.confirm("确定要退出？")) return;
    setIsLoading(true);
    try {
      const res = await cloud.invoke("quit-activity", { activityId, username: currentUser });
      if (res.ok) { alert("已退出"); fetchActivities(); } else { alert(res.msg); }
    } catch (e) { alert("网络错误"); } finally { setIsLoading(false); }
  };

  const handleToggleComplete = async (activityId: string, currentStatus: string) => {
    const isCompleting = currentStatus !== 'completed';
    if (!window.confirm(isCompleting ? "🎉 确认成团？" : "↩️ 撤回完成状态？")) return;
    setIsLoading(true);
    try {
      const res = await cloud.invoke("toggle-complete", { activityId, username: currentUser });
      if (res.ok) setActivities(prev => prev.map(a => a._id === activityId ? { ...a, status: res.status } : a));
      else alert(res.msg);
    } catch (e) { alert("网络错误"); } finally { setIsLoading(false); }
  };

  const handleCommonOp = async (opName: string, activityId: string, confirmMsg: string) => {
    if (!window.confirm(confirmMsg)) return;
    setIsLoading(true);
    try {
      const res = await cloud.invoke(opName, { activityId, username: currentUser });
      if (res.ok) { fetchActivities(); if(opName==='hide-activity') setActivities(prev=>prev.filter(a=>a._id!==activityId)); } // 简单处理
      else alert(res.msg || "失败");
    } catch (e) { alert("网络错误"); } finally { setIsLoading(false); }
  };

  // 认证逻辑
  const sendCode = async () => {
    if (!verifyEmail.endsWith("nju.edu.cn")) { alert("请使用 @smail.nju.edu.cn 或 @nju.edu.cn 结尾的邮箱"); return; }
    setIsSendingCode(true);
    try {
      const res = await cloud.invoke("verify-email", { type: 'send', email: verifyEmail, username: currentUser });
      if (res.ok) alert("验证码已发送，请查收邮件"); else alert(res.msg);
    } catch(e) { alert("发送失败"); } finally { setIsSendingCode(false); }
  };

  const verifyCodeAction = async () => {
    if(!verifyCode) return;
    try {
      const res = await cloud.invoke("verify-email", { type: 'verify', email: verifyEmail, code: verifyCode, username: currentUser });
      if (res.ok) { 
        alert("认证成功！");
        
        // ✨ 新增这两行：手动更新本地状态，不需要等网络请求
        setUserData(prev => prev ? { ...prev, is_verified: true, edu_email: verifyEmail } : null);
        
        // 原来的逻辑保留，作为双重保险
        fetchUserData(currentUser); 
      } else {
        alert(res.msg);
      }
    } catch(e) { alert("验证失败"); }
  };

  // 档案更新逻辑
  const saveProfile = async () => {
    try {
      const res = await cloud.invoke("user-ops", { type: 'update-profile', username: currentUser, profile: tempProfile });
      if (res.ok) { alert("档案已保存"); setUserData(prev => prev ? {...prev, profile: tempProfile} : null); setIsEditingProfile(false); }
    } catch(e) { alert("保存失败"); }
  };

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault(); if (!currentUser) return;
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const minVal = parseInt(formData.get('min_people') as string) || 2;
    const maxVal = parseInt(formData.get('max_people') as string) || 5;
    if (minVal < 2) { alert("❌ 至少 2 人"); return; }
    if (maxVal < minVal) { alert(`❌ 人数设置错误`); return; }

    const timeString = inputTimeStr.trim();
    if (!timeString) { alert("⏰ 请填写时间"); return; }

    setIsLoading(true);
    const newActivity = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      category: formData.get('category'),
      max_people: maxVal,
      min_people: minVal,
      time: timeString, 
      location: formData.get('location') as string,
      author: currentUser,
      requires_verification: formData.get('requires_verification') === 'on', // 🆕
      created_at: Date.now(),
      joined_users: [currentUser],
      hidden_by: [],
      status: 'active'
    };
    const res = await cloud.invoke("create-activity", newActivity);
    if (res && res.id) { setShowCreateModal(false); fetchActivities(); } else { alert("发布失败"); }
    setIsLoading(false);
  };

  // 登录注册逻辑 (保持精简)
  const checkUsername = async (e: React.FormEvent) => { e.preventDefault(); if(!loginName.trim())return; setIsLoading(true); setLoginError(""); try{const res=await cloud.invoke("user-ops",{type:'check',username:loginName.trim()});if(res&&res.exists)setLoginStep("nameTaken");else setLoginStep("createAccount");}catch(e){setLoginError("连接失败")}finally{setIsLoading(false);} };
  const handleLogin = async (e: React.FormEvent) => { e.preventDefault(); setIsLoading(true); const res=await cloud.invoke("user-ops",{type:'login',username:loginName.trim(),password:loginPassword});if(res&&res.ok){localStorage.setItem("club_username",loginName.trim());setCurrentUser(loginName.trim());fetchUserData(loginName.trim());setShowLoginModal(false);}else{setLoginError(res.msg||"密码错误");setIsLoading(false);} };
  const handleRegister = async (e: React.FormEvent) => { e.preventDefault(); setIsLoading(true); const res=await cloud.invoke("user-ops",{type:'register',username:loginName.trim(),password:loginPassword});if(res&&res.ok){localStorage.setItem("club_username",loginName.trim());setCurrentUser(loginName.trim());fetchUserData(loginName.trim());setShowLoginModal(false);}else{setLoginError(res.msg||"注册失败");setIsLoading(false);} };
  const handleLogout = () => { localStorage.removeItem("club_username"); setCurrentUser(""); setUserData(null); setShowLoginModal(true); setLoginStep("inputName"); setLoginName(""); setLoginPassword(""); };
  const resetToInputName = () => { setLoginStep("inputName"); setLoginError(""); setLoginPassword(""); };

  const ActivityCard = ({ activity, showJoinBtn = true, showSweepBtn = false }: { activity: Activity, showJoinBtn?: boolean, showSweepBtn?: boolean }) => {
    const [expanded, setExpanded] = useState(false);
    const joined = activity.joined_users || [];
    const isJoined = joined.includes(currentUser);
    const isAuthor = activity.author === currentUser; 
    const isFull = joined.length >= activity.max_people;
    const minP = activity.min_people || 1;
    const isDeleted = activity.status === 'deleted';
    const isCompleted = activity.status === 'completed'; 
    const isHidden = (activity.hidden_by || []).includes(currentUser);
    const isGhost = isDeleted || isHidden;
    const hasOthers = joined.length > 1;
    const canFinish = joined.length >= minP;

    let btnText = "加入"; let btnDisabled = false; let btnStyle = `${theme.primary} text-white shadow-md active:scale-95`;
    let onClick = () => handleJoin(activity._id);

    if (isGhost) { btnText = "恢复"; btnStyle = "bg-gray-800 text-white"; onClick = () => handleCommonOp("restore-activity", activity._id, "恢复?"); }
    else if (isDeleted) { btnText = "已解散"; btnDisabled = true; btnStyle = "bg-red-50 text-red-500"; }
    else if (isCompleted) {
      if (isAuthor) { btnText = "撤回完成"; btnStyle = "bg-yellow-400 text-yellow-900"; onClick = () => handleToggleComplete(activity._id, 'completed'); }
      else { btnText = "组局成功"; btnDisabled = true; btnStyle = "bg-green-100 text-green-600"; }
    } else if (isAuthor) {
      if (canFinish) { btnText = "人齐发车"; btnStyle = "bg-green-500 text-white animate-pulse"; onClick = () => handleToggleComplete(activity._id, 'active'); }
      else { btnText = `还差 ${minP - joined.length} 人`; btnDisabled = true; btnStyle = "bg-gray-100 text-gray-400"; }
    } else {
      if (isJoined) { btnText = "退出"; btnStyle = "bg-red-50 text-red-500"; onClick = () => handleQuit(activity._id); }
      else if (isFull) { btnText = "已满员"; btnDisabled = true; btnStyle = "bg-gray-200 text-gray-400"; }
    }

    return (
      <div className={`${theme.card} rounded-[2rem] p-6 shadow-sm border ${theme.border} mb-4 relative ${isGhost ? "opacity-60 grayscale border-dashed" : ""} ${isCompleted && !isGhost ? "border-l-4 border-l-green-500" : ""}`}>
        {!isGhost && isAuthor && showJoinBtn && (hasOthers ? <button onClick={() => handleQuit(activity._id)} className="absolute top-6 right-6 p-2 bg-red-50 text-red-500 rounded-full"><LogOut size={16} /></button> : <button onClick={() => handleCommonOp("delete-activity", activity._id, "解散?")} className="absolute top-6 right-6 p-2 bg-gray-50 text-gray-400 rounded-full"><Trash2 size={16} /></button>)}
        {!isGhost && showSweepBtn && (isDeleted || isExpired(activity) || isCompleted) && <button onClick={() => handleCommonOp("hide-activity", activity._id, "移除?")} className="absolute top-6 right-6 p-2 bg-gray-50 text-gray-400 rounded-full"><Eraser size={16} /></button>}
        
        <div className="flex justify-between items-start mb-3 pr-10">
          <div className="flex gap-2 items-center mb-1">
             <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${activity.category === '约饭' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>{activity.category || "约饭"}</span>
             {activity.requires_verification && <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-purple-100 text-purple-600 flex items-center gap-1"><ShieldCheck size={10}/> 仅限认证</span>}
          </div>
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 ${theme.badge}`}><User size={12} /> {joined.length}/{activity.max_people}</span>
        </div>
        <h3 className="font-bold text-xl mb-2">{activity.title}</h3>
        <div className="mb-4"><p onClick={() => setExpanded(!expanded)} className="text-gray-500 text-sm leading-relaxed whitespace-pre-wrap">{expanded ? activity.description : (activity.description||"").slice(0, 50) + "..."}</p></div>
        <div className="flex flex-col gap-3">
            <div className={`flex items-center gap-2 text-sm font-bold ${theme.icon}`}><Calendar size={14}/> {activity.time}</div>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-400 font-bold"><MapPin size={14}/> {activity.location}</div>
                {showJoinBtn && <button onClick={onClick} disabled={btnDisabled} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${btnStyle}`}>{btnText}</button>}
            </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen font-sans text-slate-900 pb-32 transition-colors duration-500 ${theme.bg}`}>
      {showLoginModal && (<div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"><div className="bg-white rounded-[2rem] p-8 w-full max-w-sm text-center"><h2 className="text-3xl font-black mb-8">ClubDAO</h2>{loginStep==="inputName"&&(<form onSubmit={checkUsername}><input autoFocus value={loginName} onChange={e=>setLoginName(e.target.value)} placeholder="代号" className="w-full p-4 bg-slate-100 rounded-xl mb-4 text-center font-bold"/><button className="w-full bg-black text-white p-4 rounded-xl font-bold">下一步</button></form>)}{loginStep==="nameTaken"&&(<div className="space-y-4"><div className="bg-orange-50 text-orange-600 p-4 rounded-xl text-sm font-bold">该代号已存在</div><button onClick={()=>setLoginStep("inputPassword")} className="w-full bg-black text-white p-4 rounded-xl font-bold">是本人，去登录</button><button onClick={resetToInputName} className="w-full bg-white border p-4 rounded-xl font-bold">换个名字</button></div>)}{loginStep==="inputPassword"&&( <form onSubmit={handleLogin}><input autoFocus type="password" value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} placeholder="密码" className="w-full p-4 bg-slate-100 rounded-xl mb-4 text-center font-bold"/><button className="w-full bg-black text-white p-4 rounded-xl font-bold">登录</button></form>)}{loginStep==="createAccount"&&(<form onSubmit={handleRegister}><input autoFocus value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} placeholder="设个密码" className="w-full p-4 bg-slate-100 rounded-xl mb-4 text-center font-bold"/><button className="w-full bg-black text-white p-4 rounded-xl font-bold">注册并登录</button></form>)}{loginError&&<p className="text-red-500 mt-4 font-bold">{loginError}</p>}</div></div>)}
      
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex justify-between items-center"><div className="flex items-center gap-2"><div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg ${theme.primary}`}>C</div><span className={`font-bold text-xl ${theme.primaryText}`}>{activeTab==='square'?'ClubDAO':'我的档案'}</span></div><div className="flex items-center gap-3"><button onClick={()=>setShowThemeModal(true)} className="bg-black text-white w-8 h-8 rounded-full flex items-center justify-center"><Palette size={14}/></button><div className="bg-white border px-3 py-1.5 rounded-full font-bold text-sm flex items-center gap-2 shadow-sm"><div className={`w-6 h-6 rounded-full flex items-center justify-center text-white ${theme.accent}`}><User size={14}/></div>{currentUser}</div></div></nav>
      
      <main className="p-6 max-w-md mx-auto space-y-6">
        {activeTab === 'square' && (
          <div className="animate-fade-in space-y-6">
            <div className="relative group"><Search className="absolute left-4 top-3.5 text-gray-400" size={20} /><input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="寻找下一场活动..." className="w-full bg-white pl-12 pr-4 py-3 rounded-2xl font-bold outline-none shadow-sm" /></div>
            <div className="flex p-1.5 bg-white rounded-2xl shadow-sm gap-1">{(["全部", "约饭", "拼单"] as const).map(cat => (<button key={cat} onClick={() => setActiveCategory(cat)} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${activeCategory === cat ? `${theme.primary} text-white shadow-md` : "text-gray-400 hover:bg-gray-50"}`}>{cat}</button>))}</div>
            <div>{squareList.length === 0 && !isLoading && <div className="text-center py-12 text-gray-300 font-bold">暂无活动</div>}{squareList.map(activity => <ActivityCard key={activity._id} activity={activity} showJoinBtn={true} />)}</div>
          </div>
        )}
        
        {activeTab === 'profile' && (
          <div className="animate-fade-in space-y-6">
            {/* 头部卡片 */}
            <div className={`rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden text-white transition-colors duration-500 ${theme.primary}`}>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-2xl font-bold">{currentUser}</h1>
                  {userData?.is_verified ? <div className="px-2 py-1 bg-yellow-400 text-yellow-900 text-[10px] font-black rounded-md flex items-center gap-1"><ShieldCheck size={12}/> 已认证</div> : <div className="px-2 py-1 bg-black/20 text-white/70 text-[10px] font-bold rounded-md flex items-center gap-1"><Shield size={12}/> 未认证</div>}
                </div>
                <p className="text-white/80 text-sm mb-6">{userData?.profile?.intro || "这个人很懒，还没写自我介绍..."}</p>
                <div className="flex gap-4 text-center">
                  <div><p className="text-2xl font-bold">{userActivityCount}</p><p className="text-[10px] opacity-60">参与</p></div>
                  <div><p className="text-2xl font-bold">{userData?.is_verified ? 'V' : 'X'}</p><p className="text-[10px] opacity-60">校友</p></div>
                </div>
              </div>
              <Zap className="absolute right-[-20px] top-[-20px] opacity-20 rotate-12" size={160} />
            </div>

            {/* 认证卡片 (仅当未认证时显示) */}
            {!userData?.is_verified && (
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-purple-100">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-purple-800"><Mail size={18}/> 校园邮箱认证</h3>
                <div className="space-y-3">
                  <input value={verifyEmail} onChange={e=>setVerifyEmail(e.target.value)} placeholder="学号@smail.nju.edu.cn" className="w-full bg-purple-50 p-3 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-purple-200"/>
                  <div className="flex gap-2">
                    <input value={verifyCode} onChange={e=>setVerifyCode(e.target.value)} placeholder="6位验证码" className="flex-1 bg-purple-50 p-3 rounded-xl font-bold text-sm outline-none"/>
                    <button onClick={sendCode} disabled={isSendingCode} className="px-4 py-2 bg-purple-600 text-white rounded-xl font-bold text-xs whitespace-nowrap">{isSendingCode?"发送中":"获取验证码"}</button>
                  </div>
                  <button onClick={verifyCodeAction} className="w-full py-3 bg-black text-white rounded-xl font-bold text-sm mt-2">提交认证</button>
                </div>
              </div>
            )}

            {/* 个人档案 */}
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg">个人档案</h3>
                <button onClick={()=>{if(isEditingProfile)saveProfile();setIsEditingProfile(!isEditingProfile);}} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                  {isEditingProfile ? <Save size={18} className="text-green-600"/> : <Edit3 size={18} className="text-gray-500"/>}
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                     <label className="text-[10px] font-bold text-gray-400 uppercase">性别</label>
                     {isEditingProfile ? (
                       <select value={tempProfile.gender||"保密"} onChange={e=>setTempProfile({...tempProfile, gender: e.target.value as any})} className="w-full bg-gray-50 p-3 rounded-xl text-sm font-bold outline-none"><option>男</option><option>女</option><option>保密</option></select>
                     ) : <div className="p-3 bg-gray-50 rounded-xl text-sm font-bold">{userData?.profile?.gender||"未填写"}</div>}
                   </div>
                   <div className="space-y-1">
                     <label className="text-[10px] font-bold text-gray-400 uppercase">年级</label>
                     {isEditingProfile ? (
                       <select value={tempProfile.grade||""} onChange={e=>setTempProfile({...tempProfile, grade: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl text-sm font-bold outline-none"><option value="">请选择</option><option>本科大一</option><option>本科大二</option><option>本科大三</option><option>本科大四</option><option>硕士研究生</option><option>博士研究生</option></select>
                     ) : <div className="p-3 bg-gray-50 rounded-xl text-sm font-bold">{userData?.profile?.grade||"未填写"}</div>}
                   </div>
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-bold text-gray-400 uppercase">来自城市</label>
                   {isEditingProfile ? (
                     <input value={tempProfile.city||""} onChange={e=>setTempProfile({...tempProfile, city: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl text-sm font-bold outline-none" placeholder="例如：江苏南京"/>
                   ) : <div className="p-3 bg-gray-50 rounded-xl text-sm font-bold">{userData?.profile?.city||"未填写"}</div>}
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-bold text-gray-400 uppercase">兴趣爱好</label>
                   {isEditingProfile ? (
                     <input value={tempProfile.hobbies||""} onChange={e=>setTempProfile({...tempProfile, hobbies: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl text-sm font-bold outline-none" placeholder="例如：羽毛球、摄影、德州扑克"/>
                   ) : <div className="p-3 bg-gray-50 rounded-xl text-sm font-bold">{userData?.profile?.hobbies||"未填写"}</div>}
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-bold text-gray-400 uppercase">自我介绍 (目标)</label>
                   {isEditingProfile ? (
                     <textarea value={tempProfile.intro||""} onChange={e=>setTempProfile({...tempProfile, intro: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl text-sm font-bold outline-none h-24 resize-none" placeholder="想找什么样的搭子？"/>
                   ) : <div className="p-3 bg-gray-50 rounded-xl text-sm font-bold whitespace-pre-wrap">{userData?.profile?.intro||"未填写"}</div>}
                </div>
              </div>
            </div>

            {/* 管理操作 */}
            <div className="flex justify-between items-end pl-2 pr-2">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">My History</h3>
              <button onClick={() => setShowHiddenItems(!showHiddenItems)} className={`text-xs font-bold flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all ${showHiddenItems ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-400"}`}>{showHiddenItems ? <><Eye size={12}/> 隐藏</> : <><EyeOff size={12}/> 显示</>}</button>
            </div>
            <div>{myActivities.length === 0 && <div className="text-center py-12 text-gray-300 font-bold">空空如也</div>}{myActivities.map(activity => <ActivityCard key={activity._id} activity={activity} showJoinBtn={false} showSweepBtn={true} />)}</div>
            <div className="mt-8 mb-4 flex justify-center"><button onClick={handleLogout} className="px-6 py-2 bg-gray-100 text-gray-400 rounded-full font-bold text-xs hover:bg-red-50 hover:text-red-500 transition-colors">退出登录</button></div>
          </div>
        )}
      </main>

      {/* 悬浮按钮与底部导航 */}
      {activeTab === 'square' && (<button onClick={() => setShowCreateModal(true)} className={`fixed bottom-24 right-6 w-14 h-14 text-white rounded-[1.2rem] flex items-center justify-center shadow-2xl transition-all hover:scale-110 active:scale-90 z-30 ${theme.primary}`}><Plus size={28} /></button>)}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-gray-100 pb-safe pt-2 px-6 flex justify-around items-center z-50 h-20"><button onClick={() => setActiveTab('square')} className={`flex flex-col items-center gap-1 w-16 transition-colors ${activeTab === 'square' ? theme.navActive : theme.navInactive}`}><Home size={24} strokeWidth={activeTab === 'square' ? 3 : 2} /><span className="text-[10px] font-bold">广场</span></button><button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1 w-16 transition-colors ${activeTab === 'profile' ? theme.navActive : theme.navInactive}`}><LayoutGrid size={24} strokeWidth={activeTab === 'profile' ? 3 : 2} /><span className="text-[10px] font-bold">我的</span></button></div>

      {/* 主题弹窗 */}
      {showThemeModal && (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"><div className="bg-white w-full max-w-sm rounded-3xl p-6 animate-slide-up"><h3 className="text-xl font-black mb-6 text-center">选择界面风格</h3><div className="grid grid-cols-3 gap-4"><button onClick={() => handleSetTheme("warm")} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 ${currentTheme==='warm'?'border-orange-500 bg-orange-50':'border-transparent bg-gray-50'}`}><div className="w-8 h-8 rounded-full bg-orange-500 shadow-md"></div><span className="text-xs font-bold">暖阳橙</span></button><button onClick={() => handleSetTheme("cool")} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 ${currentTheme==='cool'?'border-blue-500 bg-blue-50':'border-transparent bg-gray-50'}`}><div className="w-8 h-8 rounded-full bg-blue-500 shadow-md"></div><span className="text-xs font-bold">清凉蓝</span></button><button onClick={() => handleSetTheme("nju")} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 ${currentTheme==='nju'?'border-purple-800 bg-purple-50':'border-transparent bg-gray-50'} relative overflow-hidden`}><div className="w-8 h-8 rounded-full bg-[#6A005F] shadow-md flex items-center justify-center">{userActivityCount < 10 && <Lock size={14} className="text-white/50"/>}</div><span className="text-xs font-bold text-[#6A005F]">南大紫</span></button></div><button onClick={() => setShowThemeModal(false)} className="w-full mt-6 py-3 bg-gray-100 rounded-xl font-bold text-gray-500">关闭</button></div></div>)}
      
      {/* 发布活动弹窗 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-white/95 backdrop-blur-xl z-50 p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6 pt-4"><h2 className="text-3xl font-black">发布活动</h2><button onClick={() => setShowCreateModal(false)} className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-400">✕</button></div>
          <form onSubmit={handleCreateActivity} className="flex-1 space-y-6 overflow-y-auto pb-20">
            <div className="space-y-2"><label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">分类</label><div className="flex gap-4"><label className="flex-1 cursor-pointer"><input type="radio" name="category" value="约饭" defaultChecked className="peer hidden" /><div className="bg-gray-100 peer-checked:bg-orange-500 peer-checked:text-white py-3 rounded-xl text-center font-bold flex items-center justify-center gap-2 transition-all"><Utensils size={16}/> 约饭</div></label><label className="flex-1 cursor-pointer"><input type="radio" name="category" value="拼单" className="peer hidden" /><div className="bg-gray-100 peer-checked:bg-blue-600 peer-checked:text-white py-3 rounded-xl text-center font-bold flex items-center justify-center gap-2 transition-all"><ShoppingBag size={16}/> 拼单</div></label></div></div>
            <div className="space-y-2"><label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">标题</label><input name="title" required className="w-full text-2xl font-bold border-b-2 border-gray-100 py-3 outline-none bg-transparent" placeholder="例如：周末火锅局" /></div>
            
            {/* 时间选择器 */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">时间</label>
              <div className="flex gap-2 items-center">
                <div className="relative flex-[1.2]"><select value={dateState.year} onChange={(e) => handleDateChange('year', e.target.value)} className="w-full bg-gray-50 text-center font-bold text-lg py-3 rounded-xl outline-none">{range(2025, 2030).map(y => <option key={y} value={y}>{y}</option>)}</select></div>
                <div className="relative flex-1"><select value={dateState.month} onChange={(e) => handleDateChange('month', e.target.value)} className="w-full bg-gray-50 text-center font-bold text-lg py-3 rounded-xl outline-none">{range(1, 12).map(m => <option key={m} value={m}>{m}月</option>)}</select></div>
                <div className="relative flex-1"><select value={dateState.day} onChange={(e) => handleDateChange('day', e.target.value)} className="w-full bg-gray-50 text-center font-bold text-lg py-3 rounded-xl outline-none">{range(1, getDaysInMonth(dateState.year, dateState.month)).map(d => <option key={d} value={d}>{d}日</option>)}</select></div>
                <span className="text-gray-300 font-bold">-</span>
                <div className="relative flex-1"><select value={dateState.hour} onChange={(e) => handleDateChange('hour', e.target.value)} className="w-full bg-gray-50 text-center font-bold text-lg py-3 rounded-xl outline-none">{range(0, 23).map(h => <option key={h} value={h}>{h.toString().padStart(2, '0')}</option>)}</select></div>
                <span className="text-gray-300 font-bold">:</span>
                <div className="relative flex-1"><select value={dateState.minute} onChange={(e) => handleDateChange('minute', e.target.value)} className="w-full bg-gray-50 text-center font-bold text-lg py-3 rounded-xl outline-none">{range(0, 59).map(m => <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>)}</select></div>
              </div>
            </div>

            <div className="space-y-2"><label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">地点</label><input name="location" required className="w-full bg-gray-50 rounded-2xl p-4 font-bold outline-none" /></div>
            <div className="space-y-2"><label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">人数</label><div className="flex gap-4 items-center"><div className="flex-1 bg-gray-50 rounded-2xl p-4 flex items-center gap-2"><span className="text-xs text-gray-400 font-bold">最少</span><input type="number" name="min_people" placeholder="2" min="2" className="w-full bg-transparent font-bold outline-none text-center" /></div><span className="text-gray-300 font-bold">-</span><div className="flex-1 bg-gray-50 rounded-2xl p-4 flex items-center gap-2"><span className="text-xs text-gray-400 font-bold">最多</span><input type="number" name="max_people" placeholder="5" min="2" className="w-full bg-transparent font-bold outline-none text-center" /></div></div></div>
            
            {/* 🆕 认证限制开关 */}
            <div className="flex items-center justify-between bg-purple-50 p-4 rounded-2xl border border-purple-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-200 flex items-center justify-center text-purple-700"><ShieldCheck size={20}/></div>
                <div><div className="font-bold text-sm text-purple-900">仅限认证校友</div><div className="text-[10px] text-purple-500 font-bold">开启后，未认证用户无法加入</div></div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" name="requires_verification" className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            <div className="space-y-2"><label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">详情</label><textarea name="description" placeholder="年级要求、口味偏好、具体流程..." className="w-full bg-gray-50 rounded-2xl p-4 h-32 resize-none outline-none font-medium text-sm" /></div>
            <button disabled={isLoading} type="submit" className={`w-full text-white py-5 rounded-2xl font-bold text-xl shadow-xl mt-8 ${theme.primary}`}>{isLoading ? "发布中..." : "即刻发布"}</button>
          </form>
        </div>
      )}
    </div>
  );
}

export default App;
