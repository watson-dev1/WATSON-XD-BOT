export const items = {
    // --- DAFTAR BARANG TOKO ---
    pancing: { name: "Pancing", price: 15000, desc: "Alat untuk menangkap ikan.", type: "tool", buyable: true },
    pedang: { name: "Pedang Kayu", price: 25000, desc: "Senjata untuk merampok teman.", type: "weapon", buyable: true },
    ramuan: { name: "Ramuan Darah", price: 5000, desc: "Memulihkan 100 HP saat kelelahan.", type: "consumable", buyable: true },
    batu: { name: "Batu Kerikil", price: 1000, desc: "Barang tidak berguna.", type: "material", buyable: true },
    
    // --- HASIL AKTIVITAS (Hanya bisa dijual) ---
    ikan_lele: { name: "Ikan Lele", price: 3000, desc: "Ikan hasil mancing.", type: "material", buyable: false },
    ikan_hiu: { name: "Ikan Hiu", price: 15000, desc: "Ikan langka bernilai tinggi.", type: "material", buyable: false },
    sepatu_bekas: { name: "Sepatu Bekas", price: 500, desc: "Sampah dari dasar sungai.", type: "material", buyable: false }
};