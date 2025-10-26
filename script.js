// Tunggu hingga seluruh HTML siap
document.addEventListener("DOMContentLoaded", () => {

  // Atur base URL untuk autoloader mode
  CodeMirror.modeURL = "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/%N/%N.min.js";

  // --- LOGIKA TEMA ---
  const themeToggle = document.getElementById('themeToggle');
  const body = document.body;
  const defaultEditorTheme = 'default';
  const darkEditorTheme = 'material-darker';

  function applyTheme(theme) {
    if (theme === 'dark') {
      body.classList.add('theme-dark');
      if (themeToggle) themeToggle.checked = true;
      return darkEditorTheme;
    } else {
      body.classList.remove('theme-dark');
      if (themeToggle) themeToggle.checked = false;
      return defaultEditorTheme;
    }
  }

  let savedTheme = localStorage.getItem('theme') || 'light';
  let initialEditorTheme = applyTheme(savedTheme);

  // --- Inisialisasi CodeMirror ---
  const editor = CodeMirror.fromTextArea(document.getElementById("content"), {
    lineNumbers: true,
    mode: "null", 
    theme: initialEditorTheme,
    tabSize: 2,
    styleActiveLine: true,
    matchBrackets: true
    // HAPUS: extraKeys (kita tidak lagi menggunakan dialog bawaan)
  });

  // --- Selector Elemen ---
  const dropdown = document.querySelector(".dropdown");
  const dropdownBtn = document.getElementById("dropdownBtn");
  const dropdownMenu = document.getElementById("dropdownMenu");
  const filetypeInput = document.getElementById("filetype");
  const filenameInput = document.getElementById("filename"); 
  
  const copyBtn = document.getElementById('copyBtn');
  const openFileBtn = document.getElementById('openFileBtn');
  const fileOpener = document.getElementById('fileOpener');
  
  // BARU: Selector Search/Replace Kustom
  const realtimeSearchInput = document.getElementById('realtimeSearchInput');
  const searchInput = document.getElementById('searchInput');
  const replaceInput = document.getElementById('replaceInput');
  const replaceBtn = document.getElementById('replaceBtn');
  const replaceAllBtn = document.getElementById('replaceAllBtn');

  // BARU: Variabel untuk menyimpan highlight
  let searchMarkers = [];

  // --- Logika Dropdown ---
  dropdownBtn.addEventListener("click", () => {
    dropdown.classList.toggle("show");
  });

  dropdownMenu.querySelectorAll("div").forEach(item => {
    item.addEventListener("click", () => {
      const value = item.getAttribute("data-value");
      const content = item.innerHTML; 

      dropdownBtn.innerHTML = `<span class="btn-label-group">${content}</span> <i class="fa-solid fa-caret-down"></i>`;
      filetypeInput.value = value;
      dropdown.classList.remove("show");

      let modeInfo = CodeMirror.findModeByExtension(value);
      if (modeInfo) {
        let modeName = modeInfo.mode; 
        let mimeType = modeInfo.mime;
        editor.setOption("mode", mimeType);
        CodeMirror.autoLoadMode(editor, modeName);
      } else {
        editor.setOption("mode", "null");
      }
    });
  });

  // Close dropdown if clicked outside
  window.addEventListener("click", (e) => {
    if (dropdown && !dropdown.contains(e.target)) {
      dropdown.classList.remove("show");
    }
  });

  // --- Logika Download File ---
  document.getElementById("downloadBtn").addEventListener("click", () => {
    const filename = filenameInput.value.trim();
    const filetype = filetypeInput.value;
    const content = editor.getValue();

    if (!filename) {
      alert("Please enter a filename.");
      return;
    }

    const fullName = filename + "." + filetype;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fullName;
    link.click();
    URL.revokeObjectURL(link.href);
  });

  // --- Logika Tema ---
  themeToggle.addEventListener('change', () => {
    let newTheme = themeToggle.checked ? 'dark' : 'light';
    let editorTheme = applyTheme(newTheme);
    editor.setOption('theme', editorTheme);
    localStorage.setItem('theme', newTheme);
  });

  // --- Logika Copy to Clipboard ---
  copyBtn.addEventListener('click', () => {
    const content = editor.getValue();
    navigator.clipboard.writeText(content).then(() => {
      const originalText = copyBtn.innerHTML;
      copyBtn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
      setTimeout(() => {
        copyBtn.innerHTML = originalText;
      }, 2000);
    }, () => {
      alert('Failed to copy text.');
    });
  });

  // --- Logika Open File ---
  const acceptedExtensions = [...dropdownMenu.querySelectorAll('div[data-value]')]
    .map(item => `.${item.dataset.value}`);
  acceptedExtensions.push('Dockerfile');
  fileOpener.setAttribute('accept', acceptedExtensions.join(','));

  openFileBtn.addEventListener('click', () => {
    fileOpener.click();
  });

  fileOpener.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    
    reader.onload = (event) => {
      editor.setValue(event.target.result);
      
      const fullFilename = file.name;
      let extension = fullFilename.split('.').pop();
      let baseName = fullFilename.substring(0, fullFilename.lastIndexOf('.'));
      
      if (fullFilename === 'Dockerfile') {
        extension = 'dockerfile';
        baseName = 'Dockerfile';
      }
      
      filenameInput.value = baseName;
      
      const itemToClick = dropdownMenu.querySelector(`div[data-value="${extension}"]`);
      if (itemToClick) {
        itemToClick.click();
      } else {
        dropdownMenu.querySelector('div[data-value="txt"]').click();
      }
    };
    
    reader.onerror = () => {
      alert('Failed to read file.');
    };
    
    reader.readAsText(file);
    
    e.target.value = null; 
  });
  
  // --- BARU: Logika Search/Replace Kustom ---
  
  // Fungsi untuk membersihkan highlight
  function clearSearchHighlights() {
    searchMarkers.forEach(marker => marker.clear());
    searchMarkers = [];
  }

  // 1. Real-time Search (di Header)
  realtimeSearchInput.addEventListener('input', () => {
    clearSearchHighlights(); // Hapus highlight sebelumnya
    const query = realtimeSearchInput.value;
    if (!query) return; // Kosongkan jika tidak ada query

    const cursor = editor.getSearchCursor(query, {line: 0, ch: 0}, {caseFold: true});
    while (cursor.findNext()) {
      const marker = editor.markText(cursor.from(), cursor.to(), {
        className: 'cm-search-match'
      });
      searchMarkers.push(marker);
    }
  });

  // 2. Replace (di Sidebar)
  replaceBtn.addEventListener('click', () => {
    const searchQuery = searchInput.value;
    const replaceText = replaceInput.value;
    if (!searchQuery) return;

    // Mulai pencarian dari posisi kursor saat ini
    let cursor = editor.getSearchCursor(searchQuery, editor.getCursor(), {caseFold: true});

    if (!cursor.findNext()) {
      // Jika tidak ditemukan, coba lagi dari awal dokumen
      cursor = editor.getSearchCursor(searchQuery, {line: 0, ch: 0}, {caseFold: true});
      if (!cursor.findNext()) {
        // Tidak ada yang cocok sama sekali
        return;
      }
    }
    
    // Temukan & ganti, lalu pilih teks yang baru diganti
    editor.setSelection(cursor.from(), cursor.to());
    cursor.replace(replaceText);
  });

  // 3. Replace All (di Sidebar)
  replaceAllBtn.addEventListener('click', () => {
    const searchQuery = searchInput.value;
    const replaceText = replaceInput.value;
    if (!searchQuery) return;

    const cursor = editor.getSearchCursor(searchQuery, {line: 0, ch: 0}, {caseFold: true});
    while (cursor.findNext()) {
      cursor.replace(replaceText);
    }
  });


// TUTUP event listener DOMContentLoaded
});