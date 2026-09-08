const pets = require("../../../shared/pets.json");
function socialMenu(client, openPanel, speak, openChat, openAi) {
  const s = client?.state;
  const ready = s?.status === "online";
  const available = ready && !s.pending;
  const label = (id) => {
    const peer = s.peers.find((p) => p.id === id);
    return `${pets.find((p) => p.id === peer?.character)?.name || "夥伴"} · ${id.slice(0, 8)}`;
  };
  const send = (message) => () => {
    if (client.state.status !== "online" || client.state.pending) {
      speak("連線未就緒或上一個操作仍在處理中，請稍後再試");
      return;
    }
    client.request(message, true);
  };
  const items = [
    {
      label: "🤖 問問 Pali",
      enabled: !!s?.url,
      click: openAi,
    },
    { type: "separator" },
    {
      label: ready ? `在線夥伴（${s.peers.length}）` : "互動服務尚未連線",
      enabled: false,
    },
  ];
  if (ready) {
    if (!s.peers.length)
      items.push({ label: "目前沒有其他夥伴在線", enabled: false });
    for (const peer of s.peers)
      items.push({
        label: label(peer.id),
        submenu: [
          ...[
            ["tea", "🍵 送一杯茶"],
            ["kiss", "😘 飛吻"],
            ["hug", "🤗 抱抱"],
            ["cheer", "🎉 加油"],
          ].map(([action, title]) => ({
            label: title,
            enabled: available,
            click: send({ type: "interaction.send", to: peer.id, action }),
          })),
          {
            label: "🏓 一起打球",
            enabled: available,
            click: send({
              type: "interaction.send",
              to: peer.id,
              action: "ball",
            }),
          },
          { type: "separator" },
          {
            label: "💬 聊天",
            enabled: ready,
            click: () => openChat(peer),
          },
        ],
      });
  }

  items.push(
    { type: "separator" },
    { label: "打開控制台與設定", click: openPanel },
    { type: "separator" },
    { label: "退出 Pali", role: "quit" },
  );
  return items;
}
module.exports = { socialMenu };
