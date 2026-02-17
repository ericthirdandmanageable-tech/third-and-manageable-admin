import StatusBadge from "@/components/StatusBadge";
import { adminDb } from "@/lib/firebase-admin";
import VerifyButton from "./VerifyButton";

interface Profile {
    id: string;
    display_name: string;
    sport: string;
    athlete_status: string;
    school: string;
    streak: number;
    verified: boolean;
    joined_at: string;
}

async function getUsers(search?: string): Promise<Profile[]> {
    const snap = await adminDb.collection("profiles").get();
    let users = snap.docs.map((d) => ({
        id: d.id,
        display_name: d.data().display_name || "Unknown",
        sport: d.data().sport || "N/A",
        athlete_status: d.data().athlete_status || "N/A",
        school: d.data().school || "N/A",
        streak: d.data().streak ?? 0,
        verified: d.data().verified === true,
        joined_at: d.data().joined_at || "",
    }));

    if (search) {
        const s = search.toLowerCase();
        users = users.filter(
            (u) =>
                u.display_name.toLowerCase().includes(s) ||
                u.sport.toLowerCase().includes(s) ||
                u.school.toLowerCase().includes(s)
        );
    }

    return users.sort((a, b) => b.joined_at.localeCompare(a.joined_at));
}

export default async function UsersPage({
    searchParams,
}: {
    searchParams: Promise<{ search?: string }>;
}) {
    const params = await searchParams;
    const users = await getUsers(params.search);

    return (
        <div>
            <div className="flex items-center justify-between mb-6 sm:mb-8">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white">Users</h2>
                    <p className="text-sm text-gray-400 mt-1">{users.length} total users</p>
                </div>
            </div>

            {/* Search */}
            <form className="mb-6">
                <input
                    name="search"
                    type="text"
                    defaultValue={params.search || ""}
                    placeholder="Search by name, sport, or school..."
                    className="w-full max-w-md px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-900 border border-gray-800 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </form>

            {/* Users Table */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px]">
                        <thead>
                            <tr className="border-b border-gray-800">
                                <th className="text-left px-3 sm:px-6 py-3 text-xs sm:text-sm font-medium text-gray-400">Name</th>
                                <th className="text-left px-3 sm:px-6 py-3 text-xs sm:text-sm font-medium text-gray-400">Sport</th>
                                <th className="text-left px-3 sm:px-6 py-3 text-xs sm:text-sm font-medium text-gray-400">Status</th>
                                <th className="text-left px-3 sm:px-6 py-3 text-xs sm:text-sm font-medium text-gray-400">School</th>
                                <th className="text-left px-3 sm:px-6 py-3 text-xs sm:text-sm font-medium text-gray-400">Streak</th>
                                <th className="text-left px-3 sm:px-6 py-3 text-xs sm:text-sm font-medium text-gray-400">Verified</th>
                                <th className="text-left px-3 sm:px-6 py-3 text-xs sm:text-sm font-medium text-gray-400">Joined</th>
                                <th className="text-left px-3 sm:px-6 py-3 text-xs sm:text-sm font-medium text-gray-400">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                                    <td className="px-3 sm:px-6 py-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs sm:text-sm font-medium text-white">{user.display_name}</span>
                                            {user.verified && <svg className="w-3.5 h-3.5 text-blue-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>}
                                        </div>
                                    </td>
                                    <td className="px-3 sm:px-6 py-3 text-xs sm:text-sm text-gray-300 capitalize">{user.sport.replace("_", " ")}</td>
                                    <td className="px-3 sm:px-6 py-3">
                                        <StatusBadge
                                            status={user.athlete_status}
                                            variant={user.athlete_status === "current" ? "info" : "default"}
                                        />
                                    </td>
                                    <td className="px-3 sm:px-6 py-3 text-xs sm:text-sm text-gray-300">{user.school}</td>
                                    <td className="px-3 sm:px-6 py-3 text-xs sm:text-sm text-gray-300">{user.streak}</td>
                                    <td className="px-3 sm:px-6 py-3">
                                        {user.verified ? (
                                            <StatusBadge status="Verified" variant="success" />
                                        ) : (
                                            <StatusBadge status="Unverified" variant="warning" />
                                        )}
                                    </td>
                                    <td className="px-3 sm:px-6 py-3 text-xs text-gray-400">
                                        {user.joined_at ? new Date(user.joined_at).toLocaleDateString() : "N/A"}
                                    </td>
                                    <td className="px-3 sm:px-6 py-3">
                                        <VerifyButton userId={user.id} currentlyVerified={user.verified} />
                                    </td>
                                </tr>
                            ))}
                            {users.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                                        No users found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
