import { adminDb } from "@/lib/firebase-admin";

interface Message {
    id: string;
    room_id: string;
    user_id: string;
    display_name: string;
    sport: string;
    content: string;
    created_at: string;
}

interface Room {
    id: string;
    room_id: string;
    name: string;
    type: string;
    messageCount: number;
}

async function getCommunityData() {
    const [roomsSnap, messagesSnap] = await Promise.all([
        adminDb.collection("rooms").get(),
        adminDb.collection("messages").get(),
    ]);

    const messageCounts = new Map<string, number>();
    const allMessages: Message[] = messagesSnap.docs.map((d) => {
        const data = d.data();
        const roomId = data.room_id || "";
        messageCounts.set(roomId, (messageCounts.get(roomId) || 0) + 1);
        return {
            id: d.id,
            room_id: roomId,
            user_id: data.user_id || "",
            display_name: data.display_name || "Unknown",
            sport: data.sport || "",
            content: data.content || "",
            created_at: data.created_at || "",
        };
    });

    const rooms: Room[] = roomsSnap.docs.map((d) => {
        const data = d.data();
        return {
            id: d.id,
            room_id: data.room_id || d.id,
            name: data.name || "Unnamed Room",
            type: data.type || "global",
            messageCount: messageCounts.get(data.room_id || d.id) || 0,
        };
    });

    const recentMessages = allMessages
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 50);

    return { rooms, recentMessages, totalMessages: allMessages.length };
}

export default async function CommunityPage() {
    const { rooms, recentMessages, totalMessages } = await getCommunityData();

    return (
        <div>
            <div className="mb-6 sm:mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-white">Community</h2>
                <p className="text-sm text-gray-400 mt-1">{totalMessages} messages across {rooms.length} rooms</p>
            </div>

            {/* Rooms Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
                {rooms.map((room) => (
                    <div key={room.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-5">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm sm:text-base font-semibold text-white">{room.name}</h3>
                            <span className="text-xs px-2 py-1 bg-blue-900/30 text-blue-400 rounded-full">{room.type}</span>
                        </div>
                        <p className="text-xl sm:text-2xl font-bold text-white">{room.messageCount}</p>
                        <p className="text-xs text-gray-400">messages</p>
                    </div>
                ))}
                {rooms.length === 0 && (
                    <div className="col-span-full bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-500">
                        No rooms found
                    </div>
                )}
            </div>

            {/* Recent Messages */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl">
                <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-800">
                    <h3 className="font-semibold text-white text-sm sm:text-base">Recent Messages</h3>
                </div>
                <div className="divide-y divide-gray-800/50">
                    {recentMessages.map((msg) => (
                        <div key={msg.id} className="px-4 sm:px-6 py-3 sm:py-4 hover:bg-gray-800/20 transition-colors">
                            <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-1">
                                <span className="text-xs sm:text-sm font-medium text-white">{msg.display_name}</span>
                                {msg.sport && <span className="text-xs text-gray-500 capitalize">{msg.sport.replace("_", " ")}</span>}
                                <span className="text-[10px] sm:text-xs text-gray-600 ml-auto">
                                    {msg.created_at ? new Date(msg.created_at).toLocaleString() : ""}
                                </span>
                            </div>
                            <p className="text-xs sm:text-sm text-gray-300">{msg.content}</p>
                        </div>
                    ))}
                    {recentMessages.length === 0 && (
                        <div className="px-6 py-12 text-center text-gray-500">No messages yet</div>
                    )}
                </div>
            </div>
        </div>
    );
}
