(() => {
  // Firebase config
  const firebaseConfig = {
    apiKey: "AIzaSyBHIc2E4XwRO5FXo4uHlTQVRArOis73MjE",
    authDomain: "projeto-deus-yato-928-sk-default-rtdb.firebaseapp.com",
    databaseURL: "https://projeto-deus-yato-928-sk-default-rtdb.firebaseio.com",
    projectId: "projeto-deus-yato-928-sk-default-rtdb",
    storageBucket: "projeto-deus-yato-928-sk-default-rtdb.appspot.com",
    messagingSenderId: "790408726854",
    appId: "1:790408726854:android:e2f0de7b7d5dba96b0fd47"
  };

  // Inicializa Firebase
  firebase.initializeApp(firebaseConfig);
  const db = firebase.database();

  const conteudoAbas = document.getElementById('conteudoAbas');
  const tituloPagina = document.getElementById('tituloPagina');
  const toggleTema = document.getElementById('toggleTema');
  const toggleSom = document.getElementById('toggleSom');
  const iconeSom = document.getElementById('iconeSom');

  let autoSaveTimers = {};
  let textoAnterior = {};
  let somAtivo = false;
  let somSave;

  // Cria uma aba dinâmica
  function criarAba(i) {
    const tab = document.createElement('div');
    tab.className = `tab-pane fade${i === 1 ? ' show active' : ''}`;
    tab.id = `tab${i}`;
    tab.setAttribute('role', 'tabpanel');
    tab.setAttribute('aria-labelledby', `tab${i}-tab`);
    tab.innerHTML = `
      <input type="text" id="autor${i}" placeholder="@SeuNome" aria-label="Nome do autor do slide ${i}" />
      <div>Escrito por: <span id="nome${i}">Ninguém ainda</span></div>

      <div class="search-box position-relative">
        <input type="search" id="search${i}" placeholder="Buscar texto nesta aba..." aria-label="Pesquisar texto na aba ${i}" autocomplete="off" />
        <i class="bi bi-search search-icon" aria-hidden="true"></i>
      </div>

      <textarea id="txt${i}" placeholder="Digite aqui..." aria-label="Conteúdo do slide ${i}"></textarea>

      <div class="status-bar">
        <span id="contador${i}">Linhas: 0 | Caracteres: 0</span>
      </div>

      <div class="d-flex mt-2 flex-wrap gap-2">
        <button class="btn btn-success" id="salvar${i}" aria-label="Salvar texto da aba ${i}">
          <i class="bi bi-check-circle"></i> Salvar
        </button>
        <button class="btn btn-danger btn-clear" id="limpar${i}" aria-label="Limpar texto e autor da aba ${i}">
          <i class="bi bi-trash3"></i> Limpar
        </button>
        <button class="btn btn-warning" id="exportar${i}" aria-label="Exportar conteúdo para arquivo TXT da aba ${i}">
          <i class="bi bi-download"></i> Exportar
        </button>
      </div>

      <div class="saved-message" id="msg${i}" role="alert" aria-live="assertive" aria-atomic="true"></div>
    `;
    conteudoAbas.appendChild(tab);

    // Referências
    const autorInput = tab.querySelector(`#autor${i}`);
    const nomeDisplay = tab.querySelector(`#nome${i}`);
    const searchInput = tab.querySelector(`#search${i}`);
    const textoArea = tab.querySelector(`#txt${i}`);
    const contador = tab.querySelector(`#contador${i}`);
    const msgEl = tab.querySelector(`#msg${i}`);
    const btnSalvar = tab.querySelector(`#salvar${i}`);
    const btnLimpar = tab.querySelector(`#limpar${i}`);
    const btnExportar = tab.querySelector(`#exportar${i}`);

    // Atualiza nome do autor e habilita textarea
    autorInput.addEventListener('input', () => {
      const nome = autorInput.value.trim();
      nomeDisplay.textContent = nome || 'Ninguém ainda';
      textoArea.disabled = nome === '';
      if (nome === '') {
        mostrarMensagem(i, 'Preencha o nome para habilitar o texto', 'msg-red');
      } else {
        limparMensagem(i);
      }
    });

    // Pesquisa e filtra linhas no textarea
    searchInput.addEventListener('input', () => {
      const termo = searchInput.value.toLowerCase();
      if (!termo) {
        textoArea.value = textoAnterior[i] || '';
        atualizarContador(i);
        return;
      }
      const linhas = (textoAnterior[i] || '').split('\n');
      const linhasFiltradas = linhas.filter(l => l.toLowerCase().includes(termo));
      textoArea.value = linhasFiltradas.join('\n');
      atualizarContador(i);
    });

    // Ao digitar no textarea: mostrar "Digitando..." e auto salvar depois de 5s
    textoArea.addEventListener('input', () => {
      mostrarMensagem(i, 'Digitando...', 'msg-yellow');
      atualizarContador(i);

      if (autoSaveTimers[i]) clearTimeout(autoSaveTimers[i]);
      autoSaveTimers[i] = setTimeout(() => {
        const texto = textoArea.value;
        if (textoAnterior[i] !== texto) {
          salvar(i);
        } else {
          limparMensagem(i);
        }
      }, 5000);
    });

    // Botões
    btnSalvar.addEventListener('click', () => salvar(i));
    btnLimpar.addEventListener('click', () => {
      if (confirm('Tem certeza que quer limpar nome e texto desta aba?')) {
        db.ref(`slides/slide${i}`).remove();
      }
    });
    btnExportar.addEventListener('click', () => {
      const nome = autorInput.value.trim() || 'Anonimo';
      const texto = textoArea.value || '';
      const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' });
      const link = document.createElement('a');
      link.download = `slide${i}_${nome}.txt`;
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
    });
  }

  // Atualiza contador de linhas e caracteres
  function atualizarContador(i) {
    const textoArea = document.getElementById(`txt${i}`);
    const texto = textoArea.value;
    const linhas = texto.split('\n').length;
    const caracteres = texto.length;
    document.getElementById(`contador${i}`).textContent = `Linhas: ${linhas} | Caracteres: ${caracteres}`;
  }

  // Salvar dados no Firebase
  function salvar(i) {
    const nomeInput = document.getElementById(`autor${i}`);
    const textoArea = document.getElementById(`txt${i}`);
    const nomeDisplay = document.getElementById(`nome${i}`);

    const nome = nomeInput.value.trim();
    const texto = textoArea.value;

    if (!nome) {
      mostrarMensagem(i, 'Digite seu nome antes de salvar!', 'msg-red');
      return;
    }

    db.ref(`slides/slide${i}`).set({
      autor: nome,
      texto: texto
    }).then(() => {
      nomeDisplay.textContent = nome;
      textoAnterior[i] = texto;
      mostrarMensagem(i, 'Salvo no servidor com sucesso!', 'msg-green');
      if (somAtivo) tocarSomSalvo();
      setTimeout(() => limparMensagem(i), 2500);
    }).catch(() => {
      mostrarMensagem(i, 'Erro ao salvar no servidor', 'msg-red');
    });
  }

  // Mostrar mensagem de status
  function mostrarMensagem(i, msg, classe) {
    const msgEl = document.getElementById(`msg${i}`);
    msgEl.textContent = msg;
    msgEl.className = `saved-message show ${classe}`;
  }

  // Limpar mensagem
  function limparMensagem(i) {
    const msgEl = document.getElementById(`msg${i}`);
    msgEl.className = 'saved-message';
  }

  // Tocar som ao salvar
  function tocarSomSalvo() {
    if (!somSave) {
      somSave = new Audio('https://actions.google.com/sounds/v1/cartoon/clang_and_wobble.ogg');
    }
    somSave.play();
  }

  // Atualiza título da página e cabeçalho
  function atualizarTitulo() {
    const abaAtiva = document.querySelector('.nav-link.active');
    if (abaAtiva) {
      document.title = `Editor - ${abaAtiva.textContent.trim()}`;
      tituloPagina.textContent = `Editor - ${abaAtiva.textContent.trim()}`;
    }
  }

  // Inicialização principal
  window.addEventListener('DOMContentLoaded', () => {
    // Cria abas dinâmicas
    for (let i = 1; i <= 5; i++) {
      criarAba(i);
    }

    // Inicializa tooltips Bootstrap
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(tooltipTriggerEl => new
