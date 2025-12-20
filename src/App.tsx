import { useState, useEffect } from "react";
import { Cloud, EnvironmentType } from "laf-client-sdk";
import { MapPin, Plus, Zap, User, Coffee, Calendar, Clock } from "lucide-react";

// --- 配置区域 ---
const cloud = new Cloud({
  baseUrl: "https://yqq4612qr7.bja.sealos.run", // 你的 App ID
  getAccessToken: () => localStorage.getItem("access_token") || "",
  environment: EnvironmentType.H5,
});

// --- 数据类型升级 ---
interface Activity {
  _id: string;
  title: string;
  description: string;
  max_people: number;
  time: string; // 存储完整时间字符串
  location: string;
  author: string;
  created_at?: number;
  joined_users: string[]; // [新增] 存储参加这个活动的人名数组
}

function App() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // 登录状态
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
    fetchActivities();
  }, []);

  // 📥 获取数据
  const fetchActivities = async () => {
    try {
      const res = await cloud.invoke("get-activities");
      if (res) setActivities(res);
    } catch (err) {
      console.error("加载失败", err);
    }
  };

  // 🤝 [新增] 加入活动核心逻辑
  const handleJoin = async (activityId: string) => {
    if (!currentUser) {
      alert("请先登录");
      return;
    }
    const confirm = window.confirm("确定要加入这个活动吗？");
    if (!confirm) return;

    setIsLoading(true);
    try {
      // 呼叫后端 join-activity 函数
      const res = await cloud.invoke("join-activity", {
        activityId: activityId,
        username: currentUser
      });

      if (res.ok) {
        alert("加入成功！🚀");
        fetchActivities(); // 刷新列表，显示最新人数
      } else {
        alert(res.msg); // 显示后端的错误提示（如：满员了）
      }
    } catch (error) {
      alert("网络有点卡，稍后再试");
    } finally {
      setIsLoading(false);
    }
  };

  // 🔍 检查用户
  const checkUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginName.trim()) return;
    setIsLoading(true);
    setLoginError("");

    try {
      const res = await cloud.invoke("user-ops", { type: 'check', username: loginName.trim() });
      if (res && res.exists) {
        setLoginStep("inputPassword");
      } else {
        setLoginStep("createAccount");
      }
    } catch (err) {
      setLoginError("连接服务器失败");
    } finally {
      setIsLoading(false);
    }
  };

  // 🔐 登录
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const res = await cloud.invoke("user-ops", { type: 'login', username: loginName.trim(), password: loginPassword });
    if (res && res.ok) loginSuccess();
    else {
      setLoginError(res.msg || "密码错误");
      setIsLoading(false);
    }
  };

  // 🆕 注册
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const res = await cloud.invoke("user-ops", { type: 'register', username: loginName.trim(), password: loginPassword });
    if (res && res.ok) loginSuccess();
    else {
      setLoginError(res.msg || "注册失败");
      setIsLoading(false);
    }
  };

  const loginSuccess = () => {
    localStorage.setItem("club_username", loginName.trim());
    setCurrentUser(loginName.trim());
    setShowLoginModal(false);
    setLoginName("");
    setLoginPassword("");
  };

  const handleLogout = () => {
    localStorage.removeItem("club_username");
    setCurrentUser("");
    setShowLoginModal(true);
    setLoginStep("inputName");
  };

  // 🚀 发布活动
  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsLoading(true);

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    // [细节] 处理时间显示：把 2023-10-20T14:00 转换成更好看的格式
    const rawTime = formData.get('time') as string;
    const dateObj = new Date(rawTime);
    const displayTime = dateObj.toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' });

    const newActivity = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      max_people: parseInt(formData.get('max_people') as string) || 5, // 默认5人
      time: displayTime, 
      location: formData.get('location') as string,
      author: currentUser,
      created_at: Date.now(),
      joined_users: [currentUser] // [逻辑] 发起人自动加入
    };

    const res = await cloud.invoke("create-activity", newActivity);
    if (res && res.id) {
      setShowCreateModal(false);
      fetchActivities();
    } else {
      alert("发布失败");
    }
    setIsLoading(false);
  };

  // [工具] 判断活动状态
  const getActivityStatus = (activity: Activity) => {
    const joined = activity.joined_users || [];
    const isJoined = joined.includes(currentUser);
    const isFull = joined.length >= activity.max_people;

    if (isJoined) return { text: "已加入", disabled: true, style: "bg-green-100 text-green-700" };
    if (isFull) return { text: "已满员", disabled: true, style: "bg-gray-100 text-gray-400" };
    return { text: "Join", disabled: false, style: "bg-black text-white hover:opacity-80" };
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] font-sans text-slate-900 pb-32">
      {/* 登录弹窗 (保持不变) */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl text-center">
            <h2 className="text-3xl font-black text-slate-900 mb-2">ClubDAO</h2>
            <p className="text-slate-400 mb-8 font-medium">Laf 全栈驱动</p>
            {loginStep === "inputName" && (
              <form onSubmit={checkUsername} className="space-y-4">
                <input value={loginName} onChange={(e) => setLoginName(e.target.value)} placeholder="你的代号" className="w-full px-6 py-4 rounded-2xl bg-slate-100 border-none text-center text-xl font-bold outline-none focus:ring-2 focus:ring-black" autoFocus />
                <button disabled={isLoading} className="w-full py-4 rounded-2xl bg-black text-white font-bold text-lg active:scale-95 transition-all">{isLoading ? "..." : "继续 →"}</button>
              </form>
            )}
            {loginStep === "inputPassword" && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="text-xl font-bold mb-4">{loginName}</div>
                <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="输入口令" className="w-full px-6 py-4 rounded-2xl bg-slate-100 border-none text-center text-xl font-bold outline-none focus:ring-2 focus:ring-black" autoFocus />
                <button disabled={isLoading} className="w-full py-4 rounded-2xl bg-black text-white font-bold text-lg">进入</button>
              </form>
            )}
            {loginStep === "createAccount" && (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="bg-green-50 text-green-700 p-3 rounded-xl font-bold text-sm mb-4">🎉 新人你好！请设置口令</div>
                <input value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="设置口令" className="w-full px-6 py-4 rounded-2xl bg-slate-100 border-none text-center text-xl font-bold outline-none focus:ring-2 focus:ring-black" autoFocus />
                <button disabled={isLoading} className="w-full py-4 rounded-2xl bg-black text-white font-bold text-lg">注册并进入</button>
              </form>
            )}
            {loginError && <p className="mt-4 text-red-500 font-bold bg-red-50 py-2 rounded-lg">{loginError}</p>}
          </div>
        </div>
      )}

      {/* 顶部导航 */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-black/20">C</div>
          <span className="font-bold text-xl tracking-tight hidden sm:block">ClubDAO</span>
        </div>
        <div className="flex items-center gap-3">
           <div className="bg-white border border-slate-200 pl-2 pr-4 py-1.5 rounded-full font-bold text-sm flex items-center gap-2 shadow-sm">
             <div className="w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white"><User size={14}/></div>
             {currentUser}
           </div>
           {currentUser && <button onClick={handleLogout} className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">✕</button>}
        </div>
      </nav>

      {/* 首页内容 */}
      <main className="p-6 max-w-md mx-auto space-y-8">
        {/* Banner */}
        <div className="bg-black text-white rounded-[2.5rem] p-8 shadow-2xl shadow-black/20 relative overflow-hidden group">
          <div className="relative z-10">
            <h1 className="text-lg font-medium opacity-60 mb-1">Welcome back,</h1>
            <p className="text-4xl font-bold tracking-tight">{currentUser || "Guest"}</p>
          </div>
          <Zap className="absolute right-[-20px] top-[-20px] opacity-20 rotate-12 group-hover:scale-110 transition-transform duration-500" size={160} />
        </div>

        {/* 列表标题 */}
        <div className="flex items-center gap-2 text-slate-400 font-bold text-xs tracking-widest uppercase pl-2">
          <Coffee size={14}/> Latest Events
        </div>
          
        {/* 活动列表 */}
        <div className="space-y-5">
          {activities.length === 0 && !isLoading && <div className="text-center py-12 text-slate-300 font-bold">暂无活动</div>}
          
          {activities.map((activity) => {
            const status = getActivityStatus(activity);
            const joinedCount = (activity.joined_users || []).length;
            
            return (
              <div key={activity._id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 transition-all hover:shadow-xl hover:-translate-y-1">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-xl text-slate-900 leading-snug w-2/3">{activity.title}</h3>
                  {/* 人数显示逻辑：当前/上限 */}
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 ${joinedCount >= activity.max_people ? 'bg-red-50 text-red-500' : 'bg-slate-100 text-slate-600'}`}>
                    <User size={12} />
                    {joinedCount} / {activity.max_people}
                  </span>
                </div>
                
                <p className="text-slate-500 mb-6 text-sm font-medium leading-relaxed">{activity.description}</p>
                
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-sm text-slate-400 font-bold">
                        <Calendar size={14} className="text-slate-300"/> {activity.time}
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-slate-400 font-bold">
                            <MapPin size={14} className="text-slate-300"/> {activity.location}
                        </div>
                        {/* 动态按钮：显示 Join 或 已加入 或 已满员 */}
                        <button 
                          onClick={() => handleJoin(activity._id)}
                          disabled={status.disabled}
                          className={`px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all active:scale-95 ${status.style}`}
                        >
                          {status.text}
                        </button>
                    </div>
                </div>
                {/* 如果加入了，显示所有参与者的小名字 */}
                {(activity.joined_users || []).length > 0 && (
                  <div className="mt-5 pt-4 border-t border-slate-50 flex flex-wrap gap-2">
                    {activity.joined_users.map(u => (
                      <span key={u} className="text-[10px] font-bold bg-slate-50 text-slate-400 px-2 py-1 rounded-md">@{u}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* 悬浮按钮 */}
      <button onClick={() => setShowCreateModal(true)} className="fixed bottom-8 right-8 w-16 h-16 bg-black text-white rounded-[1.2rem] flex items-center justify-center shadow-2xl shadow-black/30 hover:scale-110 hover:rotate-90 active:scale-90 transition-all z-40 group">
        <Plus size={32} className="group-hover:rotate-[-90deg] transition-transform"/>
      </button>

      {/* 发布活动弹窗 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-white/95 backdrop-blur-xl z-50 p-6 flex flex-col animate-slide-up">
           <div className="flex justify-between items-center mb-6 pt-4">
             <h2 className="text-3xl font-black tracking-tight">New Event</h2>
             <button onClick={() => setShowCreateModal(false)} className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-400 hover:bg-slate-200">✕</button>
           </div>
           
           <form onSubmit={handleCreateActivity} className="flex-1 space-y-6 overflow-y-auto pb-20">
             <div className="space-y-2">
               <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Title</label>
               <input name="title" required placeholder="活动主题" className="w-full text-2xl font-bold border-b-2 border-slate-100 py-3 focus:border-black outline-none bg-transparent placeholder:text-slate-300" />
             </div>

             {/* ⏰ 这里就是你要的时间滑动选择器 */}
             <div className="space-y-2">
               <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1"><Clock size={12}/> Time Selector</label>
               {/* type="datetime-local" 在手机上会自动唤起原生的滚轮选择器 */}
               <input 
                  type="datetime-local" 
                  name="time" 
                  required 
                  className="w-full bg-slate-50 rounded-2xl p-4 font-bold outline-none text-slate-700 focus:ring-2 focus:ring-black/5 appearance-none" 
               />
             </div>

             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Location</label>
                  <input name="location" required placeholder="哪里见？" className="w-full bg-slate-50 rounded-2xl p-4 font-bold outline-none" />
               </div>
               <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Max People</label>
                  {/* 人数限制输入框 */}
                  <input type="number" name="max_people" placeholder="5" min="2" max="100" className="w-full bg-slate-50 rounded-2xl p-4 font-bold outline-none text-center" />
               </div>
             </div>

             <div className="space-y-2">
               <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Details</label>
               <textarea name="description" required placeholder="介绍一下活动内容..." className="w-full bg-slate-50 rounded-2xl p-4 h-32 resize-none outline-none text-lg font-medium" />
             </div>
             
             <button disabled={isLoading} type="submit" className="w-full bg-black text-white py-5 rounded-2xl font-bold text-xl shadow-xl active:scale-95 transition-transform mt-8">
               {isLoading ? "Publishing..." : "Publish Now 🚀"}
             </button>
           </form>
        </div>
      )}
    </div>
  );
}

export default App;