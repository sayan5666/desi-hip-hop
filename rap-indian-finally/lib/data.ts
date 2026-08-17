export type Track = {
  id: string;
  title: string;
  artist: string;
  duration: number;
  videoId: string;
};

export type Playlist = {
  id: string;
  name: string;
  tracks: Track[];
};

export function cleanTrackTitle(title: string): string {
  if (!title) return "Untitled Track";
  let cleaned = title
    // Strip common YouTube fluff
    .replace(/^KR\$NA\s*[-–:]\s*/i, "")
    .replace(/\s*\|\s*PROD\..*$/i, "")
    .replace(/\s*\|\s*OFFICIAL.*$/i, "")
    .replace(/\s*\[OFFICIAL.*\]/gi, "")
    .replace(/\s*\(OFFICIAL.*\)/gi, "")
    .replace(/\s*\(Bonus Track\)/gi, "")
    .replace(/\s*\(Visualizer\)/gi, "")
    .replace(/\s*\(Audio\)/gi, "")
    .replace(/\s*\[Audio\]/gi, "")
    .trim();

  // If title was entirely uppercase, convert to title case
  if (cleaned.length > 3 && cleaned === cleaned.toUpperCase() && !cleaned.includes("$")) {
    cleaned = cleaned
      .toLowerCase()
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  return cleaned || title;
}

export function cleanTrackArtist(artist: string, trackTitle?: string): string {
  if (!artist || artist.toLowerCase() === "release - topic" || artist.toLowerCase() === "unknown artist") {
    // If title has artist prefix e.g. "KR$NA - ..."
    if (trackTitle && trackTitle.includes(" - ")) {
      const parts = trackTitle.split(" - ");
      if (parts[0].trim().length > 1 && parts[0].trim().length < 30) {
        return parts[0].trim();
      }
    }
    return "Desi Hip Hop";
  }

  let cleaned = artist
    .replace(/\s*-\s*Topic$/i, "")
    .replace(/\s*Topic$/i, "")
    .replace(/__\s*00$/i, "")
    .trim();

  if (cleaned === "SAMBATA") cleaned = "Sambata";
  if (cleaned === "KRSNA") cleaned = "KR$NA";

  return cleaned || "Desi Hip Hop";
}

export const playlists: Playlist[] = [
  {
    id: "default-playlist",
    name: "Default Playlist",
    tracks: [
      { id: "b_yJHwFlBvo", title: "Joota Japani", artist: "KR$NA", duration: 156, videoId: "b_yJHwFlBvo" },
      { id: "Vq68hYSvMiw", title: "TRAP PRAA", artist: "Raftaar", duration: 192, videoId: "Vq68hYSvMiw" },
      { id: "6Zv9mSiZGBU", title: "No Cap", artist: "KR$NA", duration: 206, videoId: "6Zv9mSiZGBU" },
      { id: "r2Rw9AaoTcI", title: "Hona Hi Tha", artist: "Yungsta", duration: 263, videoId: "r2Rw9AaoTcI" },
      { id: "_vj17OLdpek", title: "Woh Raat", artist: "Raftaar", duration: 193, videoId: "_vj17OLdpek" },
      { id: "ESWHVtbBMlM", title: "Machayenge 4", artist: "KR$NA", duration: 399, videoId: "ESWHVtbBMlM" },
      { id: "KqTq67Ukof4", title: "No Mercy", artist: "DEEP KALSI", duration: 218, videoId: "KqTq67Ukof4" },
      { id: "HmW1wIhyCng", title: "3:59 AM", artist: "DIVINE", duration: 273, videoId: "HmW1wIhyCng" },
      { id: "fSwe7XoAi2g", title: "Makasam", artist: "KR$NA", duration: 322, videoId: "fSwe7XoAi2g" },
      { id: "kAm1rTxIvG0", title: "Untitled", artist: "KR$NA", duration: 152, videoId: "kAm1rTxIvG0" },
      { id: "Afh-9qQYDEk", title: "Baazigar", artist: "DIVINE", duration: 170, videoId: "Afh-9qQYDEk" },
      { id: "HZYz6qzs1jU", title: "Kohinoor", artist: "DIVINE", duration: 199, videoId: "HZYz6qzs1jU" },
      { id: "so0XDycD48w", title: "Seedha Makeover", artist: "KR$NA", duration: 200, videoId: "so0XDycD48w" },
      { id: "RdEz7VqZnvE", title: "Baap Se", artist: "Fotty Seven", duration: 157, videoId: "RdEz7VqZnvE" },
      { id: "2JdQMlC43eo", title: "Maharani", artist: "KR$NA", duration: 212, videoId: "2JdQMlC43eo" },
      { id: "nwVy-A5hszU", title: "OK Report", artist: "Fotty Seven", duration: 142, videoId: "nwVy-A5hszU" },
      { id: "QDH6RL3R_gs", title: "Teesri Manzil", artist: "DIVINE", duration: 206, videoId: "QDH6RL3R_gs" },
      { id: "AtWkwaCvrHU", title: "JASHAN-E-HIP-HOP", artist: "Raftaar", duration: 173, videoId: "AtWkwaCvrHU" },
      { id: "zEi6YEq16ms", title: "Parinda", artist: "Panther", duration: 208, videoId: "zEi6YEq16ms" },
      { id: "GDKO4Q72yxw", title: "Mere Bina", artist: "KSHMR", duration: 208, videoId: "GDKO4Q72yxw" },
      { id: "PTUXeIZ2Pqw", title: "Satya", artist: "DIVINE", duration: 183, videoId: "PTUXeIZ2Pqw" },
      { id: "Qe4W3ZWlTtE", title: "Haath Varthi", artist: "MC STAN", duration: 150, videoId: "Qe4W3ZWlTtE" },
      { id: "szVmOC5Y1Dg", title: "Numb", artist: "MC STAN", duration: 166, videoId: "szVmOC5Y1Dg" },
      { id: "T6TfLviDBLg", title: "100 Million", artist: "DIVINE", duration: 193, videoId: "T6TfLviDBLg" },
      { id: "BVwZ7wbGD4I", title: "RAASHAH", artist: "Raftaar", duration: 221, videoId: "BVwZ7wbGD4I" },
      { id: "2Ec7IfGtErk", title: "Freeverse Feast", artist: "KR$NA", duration: 185, videoId: "2Ec7IfGtErk" },
      { id: "k8iKlS4Djvg", title: "W", artist: "Emiway Bantai", duration: 144, videoId: "k8iKlS4Djvg" },
      { id: "emA6OAFYrEc", title: "Gunehgar", artist: "DIVINE", duration: 164, videoId: "emA6OAFYrEc" },
      { id: "VUBw0A_9Om4", title: "Tadipaar", artist: "MC STAN", duration: 467, videoId: "VUBw0A_9Om4" },
      { id: "5LjHccZoNUo", title: "Snake", artist: "MC STAN", duration: 282, videoId: "5LjHccZoNUo" },
      { id: "T2yYWCjHyh8", title: "Shana Bann", artist: "MC STAN", duration: 229, videoId: "T2yYWCjHyh8" },
      { id: "ztp63ZQxPqs", title: "Basti Ka Hasti", artist: "MC STAN", duration: 196, videoId: "ztp63ZQxPqs" },
      { id: "4rh7AqNOJuI", title: "Broke Is A Joke", artist: "MC STAN", duration: 216, videoId: "4rh7AqNOJuI" },
      { id: "mLXNXNv6D1k", title: "Amin", artist: "MC STAN", duration: 387, videoId: "mLXNXNv6D1k" },
      { id: "h4lK-dUbUDg", title: "Zero After Zero", artist: "KSHMR", duration: 175, videoId: "h4lK-dUbUDg" },
      { id: "d6JiOfHejjk", title: "Banjo", artist: "Fotty Seven", duration: 138, videoId: "d6JiOfHejjk" },
      { id: "TDgRxko52QY", title: "Nishu", artist: "Ikka", duration: 213, videoId: "TDgRxko52QY" },
      { id: "kuvzS9EBcyQ", title: "Khoya Sab", artist: "KSHMR", duration: 256, videoId: "kuvzS9EBcyQ" },
      { id: "AJs2dtSHMUg", title: "Sab Jaanta Hai", artist: "Ikka", duration: 180, videoId: "AJs2dtSHMUg" },
      { id: "KmC9tSHXGgY", title: "Hosh Mai Aa", artist: "MC STAN", duration: 188, videoId: "KmC9tSHXGgY" },
      { id: "JKV3F9CzI0o", title: "F16", artist: "Raftaar", duration: 210, videoId: "JKV3F9CzI0o" },
      { id: "B9SnFId1sCA", title: "Pinnak", artist: "Sambata", duration: 391, videoId: "B9SnFId1sCA" },
      { id: "IUiN4s4_KCY", title: "Upar Hi Upar", artist: "KSHMR", duration: 184, videoId: "IUiN4s4_KCY" },
      { id: "2b8EbHBZ4OA", title: "Dream", artist: "KSHMR", duration: 182, videoId: "2b8EbHBZ4OA" },
      { id: "FMBybotG8aQ", title: "Dum Hai", artist: "KR$NA", duration: 217, videoId: "FMBybotG8aQ" },
      { id: "Mugze9TC2fA", title: "Bitch", artist: "MC STAN", duration: 187, videoId: "Mugze9TC2fA" },
      { id: "c4LiDibzS0w", title: "One Day Uh Gonna Pay", artist: "MC STAN", duration: 255, videoId: "c4LiDibzS0w" },
      { id: "P4WXGN-OoNI", title: "GOAT SHIT", artist: "King", duration: 232, videoId: "P4WXGN-OoNI" },
      { id: "RlMrQvSMnhQ", title: "Raat Ki Rani", artist: "Seedhe Maut", duration: 212, videoId: "RlMrQvSMnhQ" },
      { id: "UPtMjHYO6Ik", title: "Galat Karam", artist: "Panther", duration: 194, videoId: "UPtMjHYO6Ik" },
      { id: "srrGnB2yPbg", title: "F*CK WHAT THEY SAY", artist: "King", duration: 293, videoId: "srrGnB2yPbg" },
      { id: "4OIjETQVoJs", title: "Gangster Shit 1st", artist: "Sambata", duration: 322, videoId: "4OIjETQVoJs" },
      { id: "3RqzAkcuzxw", title: "Dafli Wale", artist: "Naam Sujal", duration: 171, videoId: "3RqzAkcuzxw" },
      { id: "HYFON9SxIf0", title: "WARCRY", artist: "King", duration: 301, videoId: "HYFON9SxIf0" },
      { id: "jj3AOSCEGp4", title: "Naksha", artist: "Seedhe Maut", duration: 207, videoId: "jj3AOSCEGp4" },
      { id: "KUNyHCYRcno", title: "PYAAR?", artist: "Naam Sujal", duration: 206, videoId: "KUNyHCYRcno" },
      { id: "piyEX21JUPM", title: "Vartmaan", artist: "UNIYAL", duration: 119, videoId: "piyEX21JUPM" },
      { id: "H7viYwMyHiQ", title: "Karta Kya Hai", artist: "KARMA", duration: 205, videoId: "H7viYwMyHiQ" },
      { id: "biMmaAggmjs", title: "BAWE MAIN CHECK", artist: "King", duration: 188, videoId: "biMmaAggmjs" },
      { id: "J6Y1J35-r9w", title: "Vishay Khatam", artist: "Naam Sujal", duration: 194, videoId: "J6Y1J35-r9w" },
      { id: "glKkwTl8ty4", title: "KODAK", artist: "King", duration: 364, videoId: "glKkwTl8ty4" },
      { id: "wLP2NzE2uw4", title: "BAAWE", artist: "Raftaar", duration: 160, videoId: "wLP2NzE2uw4" },
      { id: "AvAqUuhtWs0", title: "I'm Done", artist: "MC STAN", duration: 171, videoId: "AvAqUuhtWs0" },
      { id: "ZkzxTEL0jeY", title: "Blueprint", artist: "Naam Sujal", duration: 185, videoId: "ZkzxTEL0jeY" },
      { id: "0r5Qu4KbESM", title: "Run It Up", artist: "Hanumankind", duration: 174, videoId: "0r5Qu4KbESM" },
      { id: "kNCqgNnd2co", title: "Nanchaku", artist: "Seedhe Maut", duration: 194, videoId: "kNCqgNnd2co" },
      { id: "IBkT4Yww7zk", title: "Khatta Flow", artist: "Seedhe Maut", duration: 153, videoId: "IBkT4Yww7zk" },
      { id: "JCf7lKL1UQ4", title: "Big Dawgs", artist: "Hanumankind", duration: 191, videoId: "JCf7lKL1UQ4" },
      { id: "iedQY_Eq1qo", title: "DEHSHAT HO", artist: "Raftaar", duration: 196, videoId: "iedQY_Eq1qo" },
      { id: "8n_giXrAFhQ", title: "Namastute", artist: "Seedhe Maut", duration: 121, videoId: "8n_giXrAFhQ" },
      { id: "OOh5bUWroo0", title: "RED", artist: "Seedhe Maut", duration: 304, videoId: "OOh5bUWroo0" },
      { id: "E71uHxiHUvI", title: "STILL NUMBER 1", artist: "Emiway Bantai", duration: 236, videoId: "E71uHxiHUvI" },
      { id: "Y_1NX7csC_w", title: "Never Enough", artist: "KR$NA", duration: 175, videoId: "Y_1NX7csC_w" },
      { id: "jWfNlCxjLoI", title: "Pickup", artist: "Seedhe Maut", duration: 165, videoId: "jWfNlCxjLoI" },
      { id: "BvqqY8_vPXE", title: "Knock Knock", artist: "KR$NA", duration: 207, videoId: "BvqqY8_vPXE" },
      { id: "Ky-QenzQD6U", title: "Swah!", artist: "Seedhe Maut", duration: 285, videoId: "Ky-QenzQD6U" },
      { id: "nUAra7tddLY", title: "11K", artist: "Seedhe Maut", duration: 175, videoId: "nUAra7tddLY" },
      { id: "Kvsz-CtLlA4", title: "Tujhya Aaichi Gaand", artist: "MC STAN", duration: 162, videoId: "Kvsz-CtLlA4" },
      { id: "p7FbCH9Rmpo", title: "Hood Life", artist: "Sambata", duration: 198, videoId: "p7FbCH9Rmpo" },
      { id: "RSVLgzDqQ5Y", title: "Sensitive", artist: "KR$NA", duration: 224, videoId: "RSVLgzDqQ5Y" },
      { id: "XKKmxeFh8Og", title: "3 DRAGS", artist: "VICHAAR MUSIC", duration: 168, videoId: "XKKmxeFh8Og" },
      { id: "XXl_pmkAuqo", title: "Nawazuddin", artist: "Seedhe Maut", duration: 192, videoId: "XXl_pmkAuqo" },
      { id: "jPM_K1I4qak", title: "KKBN", artist: "KR$NA", duration: 173, videoId: "jPM_K1I4qak" },
      { id: "9mH-57TvCGo", title: "Luka Chippi", artist: "Seedhe Maut", duration: 142, videoId: "9mH-57TvCGo" },
      { id: "24o78-bxMYg", title: "Shit Dawg", artist: "Naam Sujal", duration: 190, videoId: "24o78-bxMYg" },
      { id: "KbJXAChagDM", title: "Talk My Shit/Guarantee", artist: "KR$NA", duration: 239, videoId: "KbJXAChagDM" },
      { id: "boZZpnlOHj4", title: "101", artist: "Seedhe Maut", duration: 198, videoId: "boZZpnlOHj4" },
      { id: "SR57_CPR-lU", title: "Shakti Aur Kshama", artist: "Seedhe Maut", duration: 256, videoId: "SR57_CPR-lU" },
      { id: "smNNpjH6kg0", title: "Protocol", artist: "Naam Sujal", duration: 207, videoId: "smNNpjH6kg0" },
      { id: "LH30BlHaOks", title: "Chowk Pe", artist: "99side", duration: 249, videoId: "LH30BlHaOks" },
      { id: "AaH9T8wLGSA", title: "Numberkari", artist: "MC STAN", duration: 248, videoId: "AaH9T8wLGSA" },
      { id: "m6i9dGJFQR4", title: "Natkhat", artist: "Seedhe Maut", duration: 192, videoId: "m6i9dGJFQR4" },
      { id: "zm-GMHEHSjA", title: "Curry Verse", artist: "LASH CURRY", duration: 198, videoId: "zm-GMHEHSjA" },
      { id: "nlXML_yFH64", title: "Ulte Karam", artist: "LASH CURRY", duration: 179, videoId: "nlXML_yFH64" },
      { id: "fnvtGb3F6Wo", title: "Caramel Tax", artist: "Dizlaw", duration: 198, videoId: "fnvtGb3F6Wo" },
      { id: "sSnNRuQP4hY", title: "Goat Dekho", artist: "Raftaar", duration: 214, videoId: "sSnNRuQP4hY" },
      { id: "QE2cd-qk2vY", title: "Dalli", artist: "Bhaskar", duration: 172, videoId: "QE2cd-qk2vY" },
      { id: "PML-mEABYPs", title: "Tere Papa", artist: "OG Lucifer", duration: 185, videoId: "PML-mEABYPs" },
      { id: "qAXtZEFHlo8", title: "MMM", artist: "Seedhe Maut", duration: 278, videoId: "qAXtZEFHlo8" },
      { id: "jXRuLeCOyLY", title: "City Slums", artist: "Raja Kumari ft. DIVINE", duration: 228, videoId: "jXRuLeCOyLY" },
    ]
  }
];
