import PromptEditor from "@/components/PromptEditor";
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
  daily_prompt: string;
  daily_prompt_author: string;
  daily_prompt_updated_at: string;
}

async function getCommunityData() {
  const [roomsSnap, messagesSnap] = await Promise.all([
    adminDb.collection("rooms").get(),
    adminDb.collection("messages").get(),
  ]);

  const messageCounts = new Map<string, number>();
  const discoveredRoomIds = new Set<string>();
  const allMessages: Message[] = messagesSnap.docs.map((d) => {
    const data = d.data();
    const roomId = data.room_id || "";
    if (roomId) discoveredRoomIds.add(roomId);
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

  // Build rooms from Firestore docs
  const roomMap = new Map<string, Room>();
  for (const d of roomsSnap.docs) {
    const data = d.data();
    const rid = data.room_id || d.id;
    roomMap.set(rid, {
      id: d.id,
      room_id: rid,
      name: data.name || (rid === "global" ? "Global Athlete Room" : rid),
      type: data.type || (rid === "global" ? "global" : "school"),
      messageCount: messageCounts.get(rid) || 0,
      daily_prompt: data.daily_prompt || "",
      daily_prompt_author: data.daily_prompt_author || "",
      daily_prompt_updated_at: data.daily_prompt_updated_at || "",
    });
  }

  // Also discover rooms from messages that don't have docs yet
  for (const rid of discoveredRoomIds) {
    if (!roomMap.has(rid)) {
      const isSchool = rid.startsWith("school_");
      const schoolName = isSchool
        ? rid
            .replace("school_", "")
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase())
        : null;
      roomMap.set(rid, {
        id: rid,
        room_id: rid,
        name:
          rid === "global"
            ? "Global Athlete Room"
            : schoolName
              ? `${schoolName} Room`
              : rid,
        type: isSchool ? "school" : "global",
        messageCount: messageCounts.get(rid) || 0,
        daily_prompt: "",
        daily_prompt_author: "",
        daily_prompt_updated_at: "",
      });
    }
  }

  // Always ensure global room exists for prompt editing
  if (!roomMap.has("global")) {
    roomMap.set("global", {
      id: "global",
      room_id: "global",
      name: "Global Athlete Room",
      type: "global",
      messageCount: 0,
      daily_prompt: "",
      daily_prompt_author: "",
      daily_prompt_updated_at: "",
    });
  }

  const rooms = Array.from(roomMap.values());
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
        <p className="text-sm text-gray-400 mt-1">
          {totalMessages} messages across {rooms.length} rooms
        </p>
      </div>

      {/* Rooms Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {rooms.map((room) => (
          <div
            key={room.id}
            className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-5"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm sm:text-base font-semibold text-white">
                {room.name}
              </h3>
              <span className="text-xs px-2 py-1 bg-blue-900/30 text-blue-400 rounded-full">
                {room.type}
              </span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-white">
              {room.messageCount}
            </p>
            <p className="text-xs text-gray-400">messages</p>
          </div>
        ))}
        {rooms.length === 0 && (
          <div className="col-span-full bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-500">
            No rooms found
          </div>
        )}
      </div>

      {/* Daily Chat Prompt Editors */}
      <div className="mb-6 sm:mb-8">
        <h3 className="text-base sm:text-lg font-semibold text-white mb-3">
          Daily Chat Prompts
        </h3>
        <p className="text-xs text-gray-400 mb-4">
          Set today&apos;s conversation prompt for each room. Changes reflect in
          the app in real time. Maximum 280 characters per prompt.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {rooms.map((room) => (
            <PromptEditor
              key={room.id}
              roomId={room.room_id}
              roomName={room.name}
              roomType={room.type}
              currentPrompt={room.daily_prompt}
              currentAuthor={room.daily_prompt_author}
              currentUpdatedAt={room.daily_prompt_updated_at}
            />
          ))}
          {rooms.length === 0 && (
            <div className="col-span-full bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-500">
              No rooms found. Create rooms in Firestore first.
            </div>
          )}
        </div>
      </div>

      {/* Recent Messages */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-800">
          <h3 className="font-semibold text-white text-sm sm:text-base">
            Recent Messages
          </h3>
        </div>
        <div className="divide-y divide-gray-800/50">
          {recentMessages.map((msg) => (
            <div
              key={msg.id}
              className="px-4 sm:px-6 py-3 sm:py-4 hover:bg-gray-800/20 transition-colors"
            >
              <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-1">
                <span className="text-xs sm:text-sm font-medium text-white">
                  {msg.display_name}
                </span>
                {msg.sport && (
                  <span className="text-xs text-gray-500 capitalize">
                    {msg.sport.replace("_", " ")}
                  </span>
                )}
                <span className="text-[10px] sm:text-xs text-gray-600 ml-auto">
                  {msg.created_at
                    ? new Date(msg.created_at).toLocaleString()
                    : ""}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-300">{msg.content}</p>
            </div>
          ))}
          {recentMessages.length === 0 && (
            <div className="px-6 py-12 text-center text-gray-500">
              No messages yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
