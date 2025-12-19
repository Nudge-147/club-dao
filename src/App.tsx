import { useState, useEffect } from "react";
import { Cloud, EnvironmentType } from "laf-client-sdk"; // 引入 SDK
import { MapPin, Plus, Zap, User, Coffee } from "lucide-react";

// ------------------------------------------------------------------
// 1. 配置 (把这里换成你的 AppID)
// ------------------------------------------------------------------
const cloud = new Cloud({
  baseUrl: "https://yqq4612qr7.bja.sealos.run", 
  getAccessToken: () => localStorage.getItem("access_token") || "",
  environment: EnvironmentType.H5, 
});

// 注意：我们不需要 db = cloud.database() 了，因为前端不直接操作数据库

interface Activity {
  _id: string; 
  title: string;
  description: string;
  people: number;
  max_people: number;
  time: string;
  location: string;
  author: string;
  created_at?: number;
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

  // 📥 [重要] 获取数据：呼叫云函数 get-activities
  const fetchActivities = async () => {
    try {
      const res = await cloud.invoke("get-activities");
      if (res) setActivities(res);
    } catch (err) {
      console.error("加载失败", err);
    }
  };

  // 🔍 [重要] 检查用户：呼叫云函数 user-ops
  const checkUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginName.trim()) return;
    setIsLoading(true);
    setLoginError("");

    try {
      const res = await cloud.invoke("user-ops", { 
        type: 'check', 
        username: loginName.trim() 
      });

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

  // 🔐 [重要] 登录
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const res = await cloud.invoke("user-ops", {
      type: 'login',
      username: loginName.trim(),
      password: loginPassword
    });

    if (res && res.ok) {
      loginSuccess();
    } else {
      setLoginError(res.msg || "密码错误");
      setIsLoading(false);
    }
  };

  // 🆕 [重要] 注册
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const res = await cloud.invoke("user-ops", {
      type: 'register',
      username: loginName.trim(),
      password: loginPassword
    });

    if (res && res.ok) {
      loginSuccess();
    } else {
      setLoginError(res.msg || "注册失败");
    }
    setIsLoading(false);
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

  // 🚀 [重要] 发布活动：呼叫云函数 create-activity
  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsLoading(true);

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const newActivity = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      people: 1,
      max_people: 10,
      time: '本周',
      location: formData.get('location') as string,
      author: currentUser,
      created_at: Date.now()
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

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pb-24">
      {/* 登录弹窗 */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center">
            <h2 className="text-3xl font-black text-gray-900 mb-2">ClubDAO</h2>
            <p className="text-gray-400 mb-8 text-sm">Powered by Laf</p>
            
            {loginStep === "inputName" && (
              <form onSubmit={checkUsername} className="space-y-4">
                <input value={loginName} onChange={(e) => setLoginName(e.target.value)} placeholder="请输入你的代号" className="w-full px-5 py-4 rounded-2xl bg-gray-100 border-none text-center text-lg font-bold outline-none" autoFocus />
                <button disabled={isLoading} className="w-full py-4 rounded-2xl bg-black text-white font-bold text-lg">{isLoading ? "检查中..." : "下一步 →"}</button>
              </form>
            )}

            {loginStep === "inputPassword" && (
              <form onSubmit={handleLogin} className="space-y-4">
                <p className="font-bold text-xl">{loginName}</p>
                <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="请输入口令" className="w-full px-5 py-4 rounded-2xl bg-gray-100 border-none text-center text-lg font-bold outline-none" autoFocus />
                <button disabled={isLoading} className="w-full py-4 rounded-2xl bg-black text-white font-bold text-lg">进入社区</button>
              </form>
            )}

            {loginStep === "createAccount" && (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="bg-green-50 text-green-700 p-3 rounded-xl text-sm font-bold mb-4">🎉 代号可用！</div>
                <input value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="设置口令 (如 1234)" className="w-full px-5 py-4 rounded-2xl bg-gray-100 border-none text-center text-lg font-bold outline-none" autoFocus />
                <button disabled={isLoading} className="w-full py-4 rounded-2xl bg-black text-white font-bold text-lg">注册并登录</button>
              </form>
            )}
            
            {loginError && <p className="mt-4 text-red-500 font-bold bg-red-50 py-2 rounded-lg">{loginError}</p>}
          </div>
        </div>
      )}

      {/* 顶部导航 */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white font-bold text-xl">C</div>
          <span className="font-bold text-lg hidden sm:block">ClubDAO</span>
        </div>
        <div className="flex items-center gap-3">
           <div className="bg-gray-100 px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2">
             <User size={16} />{currentUser || "..."}
           </div>
           {currentUser && <button onClick={handleLogout} className="text-xs text-gray-400 font-bold hover:text-red-500">退出</button>}
        </div>
      </nav>

      {/* 主要内容 */}
      <main className="p-6 max-w-md mx-auto space-y-8">
        <div className="bg-black text-white rounded-[2rem] p-8 shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <h1 className="text-2xl font-medium opacity-80 mb-1">Hello,</h1>
            <p className="text-4xl font-bold">{currentUser}</p>
          </div>
          <Zap className="absolute right-[-20px] top-[-20px] opacity-20 rotate-12" size={140} />
        </div>

        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-400 uppercase tracking-wider text-sm">
            <Coffee className="w-4 h-4" /> Latest Events
          </h2>
          <div className="space-y-4">
            {activities.length === 0 && !isLoading && <div className="text-center py-12 text-gray-300 font-bold">暂无活动</div>}
            {activities.map((activity) => (
              <div key={activity._id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-xl text-gray-900">{activity.title}</h3>
                  <span className="text-xs font-bold bg-black text-white px-3 py-1 rounded-full">{activity.people}人</span>
                </div>
                <p className="text-gray-500 mb-6 leading-relaxed">{activity.description}</p>
                <div className="flex items-center justify-between text-sm text-gray-400 font-medium">
                  <div className="flex items-center gap-3">
                     <span className="flex items-center gap-1"><MapPin size={16} className="text-black"/> {activity.location}</span>
                     <span>@{activity.author}</span>
                  </div>
                  <button className="bg-gray-100 text-black px-5 py-2 rounded-xl text-sm font-bold">Join</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* 发起活动 */}
      <button onClick={() => setShowCreateModal(true)} className="fixed bottom-8 right-8 w-16 h-16 bg-black text-white rounded-full flex items-center justify-center shadow-2xl z-40"><Plus size={32} /></button>

      {showCreateModal && (
        <div className="fixed inset-0 bg-white z-50 p-6 flex flex-col">
           <div className="flex justify-between items-center mb-8">
             <h2 className="text-3xl font-black">New Event</h2>
             <button onClick={() => setShowCreateModal(false)} className="bg-gray-100 p-2 rounded-full font-bold">✕</button>
           </div>
           <form onSubmit={handleCreateActivity} className="flex-1 space-y-8">
             <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Title</label><input name="title" required className="w-full text-2xl font-bold border-b-2 border-gray-100 py-2 outline-none" /></div>
             <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Details</label><textarea name="description" required className="w-full bg-gray-50 rounded-2xl p-4 h-40 resize-none outline-none text-lg" /></div>
             <div><label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Location</label><input name="location" required className="w-full bg-gray-50 rounded-2xl p-4 font-bold outline-none" /></div>
             <button disabled={isLoading} type="submit" className="w-full bg-black text-white py-5 rounded-2xl font-bold text-xl shadow-lg mt-auto">{isLoading ? "Publishing..." : "Publish Now 🚀"}</button>
           </form>
        </div>
      )}
    </div>
  );
}

export default App;
