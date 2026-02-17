import StatCard from "@/components/StatCard";
import { adminDb } from "@/lib/firebase-admin";
import { Activity, ClipboardList, Flame, Heart, LifeBuoy, MessageCircle, Smile, Users } from "lucide-react";

async function getStats() {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoISO = weekAgo.toISOString();

    const [profilesSnap, checkinsSnap, completionsSnap, messagesSnap, supportSnap] =
        await Promise.all([
            adminDb.collection("profiles").get(),
            adminDb.collection("checkins").get(),
            adminDb.collection("completions").get(),
            adminDb.collection("messages").get(),
            adminDb.collection("support_requests").get(),
        ]);

    const totalUsers = profilesSnap.size;
    const totalCheckins = checkinsSnap.size;
    const totalCompletions = completionsSnap.size;
    const communityMessages = messagesSnap.size;

    const todayCheckins = checkinsSnap.docs.filter((d) => d.data().date === todayStr).length;

    const newUsersThisWeek = profilesSnap.docs.filter((d) => {
        const joined = d.data().joined_at;
        return joined && joined >= weekAgoISO;
    }).length;

    const moods = checkinsSnap.docs.map((d) => d.data().mood).filter(Boolean);
    const avgMood = moods.length > 0 ? (moods.reduce((a: number, b: number) => a + b, 0) / moods.length).toFixed(1) : "N/A";

    const activeUserIds = new Set(
        checkinsSnap.docs.filter((d) => d.data().date === todayStr).map((d) => d.data().user_id)
    );

    const pendingSupport = supportSnap.docs.filter((d) => d.data().status === "pending").length;

    const streaks = profilesSnap.docs.map((d) => d.data().streak ?? 0);
    const avgStreak = streaks.length > 0 ? (streaks.reduce((a: number, b: number) => a + b, 0) / streaks.length).toFixed(1) : 0;

    const verifiedCount = profilesSnap.docs.filter((d) => d.data().verified === true).length;

    const moodDist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    moods.forEach((m: number) => { if (moodDist[m] !== undefined) moodDist[m]++; });

    const sportDist: Record<string, number> = {};
    profilesSnap.docs.forEach((d) => {
        const sport = d.data().sport || "Unknown";
        sportDist[sport] = (sportDist[sport] || 0) + 1;
    });

    return {
        totalUsers, totalCheckins, totalCompletions, communityMessages,
        todayCheckins, newUsersThisWeek, avgMood, activeUsers: activeUserIds.size,
        pendingSupport, avgStreak, verifiedCount, moodDist, sportDist,
    };
}

export default async function OverviewPage() {
    const stats = await getStats();

    const sortedSports = Object.entries(stats.sportDist).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const maxSportCount = sortedSports.length > 0 ? sortedSports[0][1] : 1;

    return (
        <div>
            <div className="mb-6 sm:mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-white">Dashboard Overview</h2>
                <p className="text-sm text-gray-400 mt-1">Real-time analytics from your app</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
                <StatCard title="Total Users" value={stats.totalUsers} icon={Users} subtitle={`${stats.newUsersThisWeek} new this week`} />
                <StatCard title="Active Today" value={stats.activeUsers} icon={Activity} subtitle={`${stats.todayCheckins} check-ins`} />
                <StatCard title="Avg Mood" value={stats.avgMood} icon={Smile} subtitle="All check-ins" />
                <StatCard title="Avg Streak" value={`${stats.avgStreak}d`} icon={Flame} subtitle={`${stats.verifiedCount} verified`} />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
                <StatCard title="Check-Ins" value={stats.totalCheckins} icon={Heart} />
                <StatCard title="Game Plans" value={stats.totalCompletions} icon={ClipboardList} />
                <StatCard title="Messages" value={stats.communityMessages} icon={MessageCircle} />
                <StatCard title="Support" value={stats.pendingSupport} icon={LifeBuoy} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Mood Distribution */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6">
                    <h3 className="text-base sm:text-lg font-semibold text-white mb-4">Mood Distribution</h3>
                    <div className="space-y-3">
                        {[
                            { mood: 5, label: "Great", color: "bg-green-500" },
                            { mood: 4, label: "Good", color: "bg-green-400" },
                            { mood: 3, label: "Okay", color: "bg-yellow-500" },
                            { mood: 2, label: "Tough", color: "bg-orange-500" },
                            { mood: 1, label: "Struggling", color: "bg-red-500" },
                        ].map(({ mood, label, color }) => {
                            const count = stats.moodDist[mood] || 0;
                            const total = Object.values(stats.moodDist).reduce((a, b) => a + b, 0);
                            const pct = total > 0 ? (count / total) * 100 : 0;
                            return (
                                <div key={mood} className="flex items-center gap-2 sm:gap-3">
                                    <span className="text-xs sm:text-sm text-gray-400 w-20 sm:w-28">{label}</span>
                                    <div className="flex-1 bg-gray-800 rounded-full h-3 sm:h-4 overflow-hidden">
                                        <div className={`${color} h-full rounded-full transition-all`} style={{ width: `${pct}%` }} />
                                    </div>
                                    <span className="text-xs text-gray-400 w-14 text-right">{pct.toFixed(0)}%</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Sport Distribution */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6">
                    <h3 className="text-base sm:text-lg font-semibold text-white mb-4">Users by Sport</h3>
                    <div className="space-y-3">
                        {sortedSports.map(([sport, count]) => (
                            <div key={sport} className="flex items-center gap-2 sm:gap-3">
                                <span className="text-xs sm:text-sm text-gray-400 w-20 sm:w-28 capitalize truncate">{sport.replace("_", " ")}</span>
                                <div className="flex-1 bg-gray-800 rounded-full h-3 sm:h-4 overflow-hidden">
                                    <div className="bg-blue-500 h-full rounded-full transition-all" style={{ width: `${(count / maxSportCount) * 100}%` }} />
                                </div>
                                <span className="text-xs text-gray-400 w-10 text-right">{count}</span>
                            </div>
                        ))}
                        {sortedSports.length === 0 && <p className="text-gray-500 text-sm">No data yet</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}
