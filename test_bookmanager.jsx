import React, { useState, useEffect, useRef } from 'react';
import { Book, PlusCircle, Camera, Barcode, Trash2, Library, X, Search, Image as ImageIcon, Globe, Download, Upload } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';

const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

const translations = {
  zh: {
    myLibrary: '我的图书馆',
    addBook: '添加新书',
    booksCount: '本',
    emptyLibrary: '书架空空如也',
    emptyLibraryHint: '点击下方的 "+" 添加你的第一本书吧',
    unknownAuthor: '未知作者',
    price: '价格',
    dateAdded: '录入日',
    scanBarcode: '扫描条形码',
    placeBarcode: '请将条形码置于取景框内',
    isbn: 'ISBN',
    isbnPlaceholder: '例如: 9784062752140',
    title: '书名',
    author: '作者',
    priceLabel: '价格 (円 / ￥)',
    pricePlaceholder: '例如: 1200円',
    bookCover: '书籍图片',
    photoUpload: '拍照 / 上传',
    photoTip: '提示: 拍照会自动覆盖网络获取的封面图。',
    saveBook: '保存书籍',
    navLibrary: '书架',
    navAdd: '录入',
    exportCSV: '导出 CSV',
    importCSV: '导入 CSV',
  },
  en: {
    myLibrary: 'My Library',
    addBook: 'Add Book',
    booksCount: 'books',
    emptyLibrary: 'Your library is empty',
    emptyLibraryHint: 'Click "+" below to add your first book',
    unknownAuthor: 'Unknown Author',
    price: 'Price',
    dateAdded: 'Date Added',
    scanBarcode: 'Scan Barcode',
    placeBarcode: 'Place barcode inside the frame',
    isbn: 'ISBN',
    isbnPlaceholder: 'e.g., 9784062752140',
    title: 'Title',
    author: 'Author',
    priceLabel: 'Price (¥)',
    pricePlaceholder: 'e.g., 1200',
    bookCover: 'Book Cover',
    photoUpload: 'Photo / Upload',
    photoTip: 'Tip: Taking a photo overwrites the fetched cover.',
    saveBook: 'Save Book',
    navLibrary: 'Library',
    navAdd: 'Add',
    exportCSV: 'Export CSV',
    importCSV: 'Import CSV',
  },
  ja: {
    myLibrary: '私のライブラリ',
    addBook: '本を追加',
    booksCount: '冊',
    emptyLibrary: '本棚は空です',
    emptyLibraryHint: '下の「+」をタップして最初の本を追加しましょう',
    unknownAuthor: '作者不明',
    price: '価格',
    dateAdded: '登録日',
    scanBarcode: 'バーコードをスキャン',
    placeBarcode: 'バーコードを枠内に配置してください',
    isbn: 'ISBN',
    isbnPlaceholder: '例: 9784062752140',
    title: 'タイトル',
    author: '著者',
    priceLabel: '価格 (円)',
    pricePlaceholder: '例: 1200円',
    bookCover: '本の画像',
    photoUpload: '写真 / アップロード',
    photoTip: 'ヒント：写真を撮ると自動取得した画像が上書きされます。',
    saveBook: '保存する',
    navLibrary: '本棚',
    navAdd: '登録',
    exportCSV: 'CSVを出力',
    importCSV: 'CSVを読込',
  }
};

const App = () => {
  const [language, setLanguage] = useState(null);
  const [user, setUser] = useState(null);
  const [books, setBooks] = useState([]);
  const [activeTab, setActiveTab] = useState('library'); // 'library' or 'add'
  const [isScanning, setIsScanning] = useState(false);
  const [scannerLoaded, setScannerLoaded] = useState(false);

  // 表单状态
  const [formData, setFormData] = useState({
    isbn: '',
    title: '',
    author: '',
    price: '',
    coverUrl: '',
    customImage: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const scannerRef = useRef(null);
  const html5QrCode = useRef(null);

  // PWA (渐进式应用) 支持设置：动态注入 Manifest 和 iOS Meta 标签
  useEffect(() => {
    // 1. 创建一个默认的 SVG 应用图标并转为 Base64
    const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="background-color:white"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>`;
    const iconUrl = 'data:image/svg+xml;base64,' + btoa(iconSvg);

    // 2. 动态生成 manifest.json 数据
    const manifest = {
      name: "藏书管理系统",
      short_name: "藏书管理",
      description: "跨设备多语言藏书管理工具",
      start_url: ".",
      display: "standalone", // 核心设置：以独立 App 模式(无浏览器地址栏)运行
      background_color: "#f9fafb",
      theme_color: "#4f46e5",
      icons: [
        {
          src: iconUrl,
          sizes: "192x192 512x512",
          type: "image/svg+xml",
          purpose: "any maskable"
        }
      ]
    };

    // 将 JSON 转为 Blob 并创建 URL
    const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
    const manifestUrl = URL.createObjectURL(blob);

    // 3. 将 manifest 注入到页面
    const linkManifest = document.createElement('link');
    linkManifest.rel = 'manifest';
    linkManifest.href = manifestUrl;
    document.head.appendChild(linkManifest);

    // 4. 注入 iOS PWA 专属的兼容标签
    const metaCapable = document.createElement('meta');
    metaCapable.name = 'apple-mobile-web-app-capable';
    metaCapable.content = 'yes'; // 允许全屏运行
    document.head.appendChild(metaCapable);

    const metaStatus = document.createElement('meta');
    metaStatus.name = 'apple-mobile-web-app-status-bar-style';
    metaStatus.content = 'black-translucent'; // 状态栏样式
    document.head.appendChild(metaStatus);

    const metaTitle = document.createElement('meta');
    metaTitle.name = 'apple-mobile-web-app-title';
    metaTitle.content = '藏书管理'; // iOS 桌面显示的名称
    document.head.appendChild(metaTitle);

    const linkAppleIcon = document.createElement('link');
    linkAppleIcon.rel = 'apple-touch-icon';
    linkAppleIcon.href = iconUrl; // iOS 桌面显示的图标
    document.head.appendChild(linkAppleIcon);

    // 组件卸载时清理内存
    return () => {
      document.head.removeChild(linkManifest);
      document.head.removeChild(metaCapable);
      document.head.removeChild(metaStatus);
      document.head.removeChild(metaTitle);
      document.head.removeChild(linkAppleIcon);
      URL.revokeObjectURL(manifestUrl);
    };
  }, []);

  // 云端认证与数据同步
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const booksRef = collection(db, 'artifacts', appId, 'users', user.uid, 'books');
    const unsubscribe = onSnapshot(booksRef, (snapshot) => {
      const loadedBooks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // 按录入时间倒序
      loadedBooks.sort((a, b) => new Date(b.entryDate) - new Date(a.entryDate));
      setBooks(loadedBooks);
    }, (error) => {
      console.error("数据同步失败:", error);
    });
    return () => unsubscribe();
  }, [user]);

  // 动态加载扫码库
  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://unpkg.com/html5-qrcode";
    script.async = true;
    script.onload = () => setScannerLoaded(true);
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
      stopScanner();
    };
  }, []);

  // 切换标签时停止扫描
  useEffect(() => {
    if (activeTab !== 'add' && isScanning) {
      stopScanner();
    }
  }, [activeTab]);

  const startScanner = async () => {
    if (!scannerLoaded) return;
    setIsScanning(true);
    
    // 延迟一点等待 DOM 渲染
    setTimeout(() => {
      if (!html5QrCode.current) {
        html5QrCode.current = new window.Html5Qrcode("reader");
      }
      
      const qrCodeSuccessCallback = (decodedText, decodedResult) => {
        // 扫码成功
        stopScanner();
        handleIsbnDetected(decodedText);
      };

      const config = { fps: 10, qrbox: { width: 250, height: 150 } };
      
      html5QrCode.current.start(
        { facingMode: "environment" }, // 使用后置摄像头
        config,
        qrCodeSuccessCallback
      ).catch(err => {
        console.error("启动摄像头失败:", err);
        setIsScanning(false);
      });
    }, 100);
  };

  const stopScanner = () => {
    if (html5QrCode.current && html5QrCode.current.isScanning) {
      html5QrCode.current.stop().then(() => {
        setIsScanning(false);
      }).catch(err => console.error("停止扫描失败", err));
    } else {
      setIsScanning(false);
    }
  };

  const handleIsbnDetected = async (isbn) => {
    // 过滤掉非数字字符
    const cleanIsbn = isbn.replace(/\D/g, '');
    setFormData(prev => ({ ...prev, isbn: cleanIsbn }));
    fetchBookData(cleanIsbn);
  };

  const fetchBookData = async (isbn) => {
    if (!isbn) return;
    setIsLoading(true);
    try {
      // 优先使用 OpenBD API (非常适合日本出版的图书)
      const openBdRes = await fetch(`https://api.openbd.jp/v1/get?isbn=${isbn}`);
      const openBdData = await openBdRes.json();
      
      if (openBdData && openBdData[0]) {
        const summary = openBdData[0].summary;
        setFormData(prev => ({
          ...prev,
          title: summary.title || prev.title,
          author: summary.author || prev.author,
          coverUrl: summary.cover || prev.coverUrl,
          // OpenBD的价格通常在ONIX数据深处，这里简化处理，留给用户手动输入或从复杂层级解析
        }));
        setIsLoading(false);
        return;
      }

      // 如果 OpenBD 没找到，回退到 Google Books API
      const gbRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
      const gbData = await gbRes.json();
      
      if (gbData.items && gbData.items.length > 0) {
        const info = gbData.items[0].volumeInfo;
        setFormData(prev => ({
          ...prev,
          title: info.title || prev.title,
          author: info.authors ? info.authors.join(', ') : prev.author,
          coverUrl: info.imageLinks ? info.imageLinks.thumbnail.replace('http:', 'https:') : prev.coverUrl,
        }));
      }
    } catch (error) {
      console.error("获取书籍信息失败:", error);
    }
    setIsLoading(false);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, customImage: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const saveBook = async () => {
    if (!formData.title || !user) return; // 至少需要书名和登录状态
    
    const newId = Date.now().toString();
    const newBook = {
      ...formData,
      entryDate: new Date().toISOString()
    };
    
    // 存入云端数据库
    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'books', newId), newBook);
    
    // 重置表单并跳回主页
    setFormData({ isbn: '', title: '', author: '', price: '', coverUrl: '', customImage: '' });
    setActiveTab('library');
  };

  const deleteBook = async (id) => {
    if (!user) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'books', id));
  };

  const exportCSV = () => {
    const headers = ['id', 'isbn', 'title', 'author', 'price', 'coverUrl', 'entryDate'];
    const csvRows = [headers.join(',')];
    
    books.forEach(book => {
      const row = headers.map(header => {
        let val = book[header] || '';
        val = val.toString().replace(/"/g, '""'); // 处理双引号
        return `"${val}"`;
      });
      csvRows.push(row.join(','));
    });
    
    // 添加 BOM 解决 Excel 中文/日文乱码问题
    const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my_library.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const importCSV = (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      const rows = text.split('\n').filter(r => r.trim());
      if (rows.length < 2) return;
      
      const headers = rows[0].split(',').map(h => h.replace(/"/g, '').trim());
      const batch = writeBatch(db);
      
      for (let i = 1; i < rows.length; i++) {
        const rowStr = rows[i];
        const values = [];
        let inQuote = false;
        let currentVal = '';
        
        for (let char of rowStr) {
          if (char === '"' && !inQuote) inQuote = true;
          else if (char === '"' && inQuote) inQuote = false;
          else if (char === ',' && !inQuote) { values.push(currentVal); currentVal = ''; }
          else currentVal += char;
        }
        values.push(currentVal);
        
        const bookData = {};
        headers.forEach((h, index) => {
          bookData[h] = values[index] ? values[index].replace(/^"|"$/g, '') : '';
        });
        
        if (bookData.title) {
          const docId = bookData.id || Date.now().toString() + i;
          delete bookData.id; 
          const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'books', docId);
          batch.set(docRef, bookData);
        }
      }
      
      await batch.commit();
      e.target.value = null; // 重置 input 状态
    };
    reader.readAsText(file);
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
  };

  // 语言选择界面
  if (!language) {
    return (
      <div className="flex flex-col h-screen bg-gray-50 font-sans max-w-md mx-auto shadow-lg items-center justify-center p-6">
        <Globe size={64} className="text-indigo-600 mb-6" />
        <h1 className="text-2xl font-bold text-gray-800 mb-2 text-center">
          Language / 言語 / 语言
        </h1>
        <p className="text-gray-500 mb-8 text-sm text-center">Please select your preferred language</p>
        <div className="w-full space-y-4">
          <button onClick={() => setLanguage('ja')} className="w-full bg-white border-2 border-indigo-100 text-indigo-700 py-4 rounded-xl font-bold text-lg hover:bg-indigo-50 transition-colors shadow-sm">
            日本語
          </button>
          <button onClick={() => setLanguage('en')} className="w-full bg-white border-2 border-indigo-100 text-indigo-700 py-4 rounded-xl font-bold text-lg hover:bg-indigo-50 transition-colors shadow-sm">
            English
          </button>
          <button onClick={() => setLanguage('zh')} className="w-full bg-white border-2 border-indigo-100 text-indigo-700 py-4 rounded-xl font-bold text-lg hover:bg-indigo-50 transition-colors shadow-sm">
            中文
          </button>
        </div>
      </div>
    );
  }

  const t = translations[language];

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans max-w-md mx-auto shadow-lg relative">
      {/* 顶部导航 */}
      <header className="bg-indigo-600 text-white p-4 shadow-md flex justify-between items-center z-10">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Book size={24} />
          {activeTab === 'library' ? t.myLibrary : t.addBook}
        </h1>
        <div className="flex items-center gap-3">
          {activeTab === 'library' && (
            <span className="text-sm bg-indigo-500 px-2 py-1 rounded-full">{books.length} {t.booksCount}</span>
          )}
          <button onClick={() => setLanguage(null)} className="p-1 hover:bg-indigo-500 rounded-full transition-colors" title="Change Language">
            <Globe size={20} />
          </button>
        </div>
      </header>

      {/* 主体内容区 */}
      <main className="flex-1 overflow-y-auto pb-20">
        {activeTab === 'library' ? (
          <div className="p-4 space-y-4">
            
            {/* 导入导出工具栏 */}
            <div className="flex gap-2 justify-end mb-2">
              <label className="flex items-center gap-1 bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-sm shadow-sm cursor-pointer hover:bg-gray-50 transition-colors">
                <Upload size={16} />
                {t.importCSV}
                <input type="file" accept=".csv" onChange={importCSV} className="hidden" />
              </label>
              <button onClick={exportCSV} className="flex items-center gap-1 bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-sm shadow-sm hover:bg-gray-50 transition-colors">
                <Download size={16} />
                {t.exportCSV}
              </button>
            </div>

            {books.length === 0 ? (
              <div className="text-center text-gray-400 mt-20 flex flex-col items-center">
                <Library size={64} className="mb-4 opacity-50" />
                <p>{t.emptyLibrary}</p>
                <p className="text-sm mt-2">{t.emptyLibraryHint}</p>
              </div>
            ) : (
              books.map(book => (
                <div key={book.id} className="bg-white p-3 rounded-xl shadow-sm flex gap-4 relative overflow-hidden">
                  {/* 封面展示，优先展示自定义拍摄照片 */}
                  <div className="w-20 h-28 bg-gray-100 rounded-md flex-shrink-0 flex items-center justify-center overflow-hidden border border-gray-100">
                    {(book.customImage || book.coverUrl) ? (
                      <img 
                        src={book.customImage || book.coverUrl} 
                        alt={book.title} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="text-gray-300" size={32} />
                    )}
                  </div>
                  
                  {/* 信息展示 */}
                  <div className="flex-1 min-w-0 py-1">
                    <h3 className="font-bold text-gray-800 text-lg truncate mb-1">{book.title}</h3>
                    <p className="text-sm text-gray-600 truncate">{book.author || t.unknownAuthor}</p>
                    <div className="mt-2 text-xs text-gray-500 space-y-1">
                      {book.isbn && <p>ISBN: {book.isbn}</p>}
                      {book.price && <p className="text-indigo-600 font-medium">{t.price}: {book.price}</p>}
                      <p>{t.dateAdded}: {formatDate(book.entryDate)}</p>
                    </div>
                  </div>
                  
                  {/* 删除按钮 */}
                  <button 
                    onClick={() => deleteBook(book.id)}
                    className="absolute top-2 right-2 p-2 text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="p-4">
            {/* 扫描区域 */}
            {isScanning ? (
              <div className="bg-black rounded-xl overflow-hidden mb-6 relative shadow-lg">
                <div id="reader" className="w-full h-64"></div>
                <button 
                  onClick={stopScanner}
                  className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full shadow-md"
                >
                  <X size={20} />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-center p-2 text-sm">
                  {t.placeBarcode}
                </div>
              </div>
            ) : (
              <div className="mb-6 flex gap-3">
                <button 
                  onClick={startScanner}
                  className="flex-1 bg-indigo-100 text-indigo-700 py-3 rounded-xl flex items-center justify-center gap-2 font-medium hover:bg-indigo-200 transition-colors"
                >
                  <Barcode size={20} />
                  {t.scanBarcode}
                </button>
              </div>
            )}

            {/* 手动输入/编辑表单 */}
            <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.isbn}</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    name="isbn"
                    value={formData.isbn}
                    onChange={handleInputChange}
                    placeholder={t.isbnPlaceholder}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  />
                  <button 
                    onClick={() => fetchBookData(formData.isbn)}
                    disabled={!formData.isbn || isLoading}
                    className="bg-gray-100 text-gray-600 px-3 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                  >
                    <Search size={20} />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.title} <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.author}</label>
                <input 
                  type="text" 
                  name="author"
                  value={formData.author}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.priceLabel}</label>
                <input 
                  type="text" 
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  placeholder={t.pricePlaceholder}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              {/* 封面图片处理 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.bookCover}</label>
                
                <div className="flex items-end gap-4">
                  {/* 图片预览 */}
                  <div className="w-24 h-32 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden relative">
                    {(formData.customImage || formData.coverUrl) ? (
                      <img 
                        src={formData.customImage || formData.coverUrl} 
                        alt="Cover preview" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="text-gray-300" size={24} />
                    )}
                    {isLoading && (
                      <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                      </div>
                    )}
                  </div>
                  
                  {/* 拍照/上传按钮 */}
                  <div className="flex-1 space-y-2">
                    <label className="flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors w-full">
                      <Camera size={18} />
                      <span className="text-sm font-medium">{t.photoUpload}</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment" // 优先调用后置摄像头
                        onChange={handleImageUpload}
                        className="hidden" 
                      />
                    </label>
                    <p className="text-xs text-gray-500">{t.photoTip}</p>
                  </div>
                </div>
              </div>

              <button 
                onClick={saveBook}
                disabled={!formData.title}
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold mt-6 shadow-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:shadow-none transition-colors"
              >
                {t.saveBook}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* 底部导航栏 */}
      <nav className="absolute bottom-0 w-full bg-white border-t border-gray-200 flex justify-around items-center h-16 pb-safe z-10">
        <button 
          onClick={() => setActiveTab('library')}
          className={`flex flex-col items-center justify-center w-full h-full ${activeTab === 'library' ? 'text-indigo-600' : 'text-gray-400'}`}
        >
          <Library size={24} className={activeTab === 'library' ? 'fill-indigo-100' : ''} />
          <span className="text-xs mt-1 font-medium">{t.navLibrary}</span>
        </button>
        <button 
          onClick={() => setActiveTab('add')}
          className={`flex flex-col items-center justify-center w-full h-full ${activeTab === 'add' ? 'text-indigo-600' : 'text-gray-400'}`}
        >
          <PlusCircle size={24} className={activeTab === 'add' ? 'fill-indigo-100' : ''} />
          <span className="text-xs mt-1 font-medium">{t.navAdd}</span>
        </button>
      </nav>
    </div>
  );
};

export default App;