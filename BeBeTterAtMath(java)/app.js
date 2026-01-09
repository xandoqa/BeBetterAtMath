// SPLASH
setTimeout(() => {
  showScreen('menu');
}, 2000);

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}

function goMenu() {
  showScreen('menu');
}

// TABUADA
let currentA = 1;
let currentB = 1;

function openTabuadaConfig() {
  showScreen('tabuadaConfig');
}

function startTabuada(level) {
  if (level === 'easy') currentA = 1;
  if (level === 'medium') currentA = 10;
  if (level === 'hard') currentA = 50;

  currentB = 1;
  showScreen('tabuadaGame');
  nextTabuada();
}

function nextTabuada() {
  document.getElementById('tabuadaAnswer').value = '';
  document.getElementById('tabuadaMessage').innerText = '';
  document.getElementById('tabuadaOperation').innerText = `${currentA} × ${currentB} = ?`;
}

function checkTabuada() {
  const answer = Number(document.getElementById('tabuadaAnswer').value);

  if (answer === currentA * currentB) {
    currentB++;
    if (currentB > 10) {
      currentB = 1;
      currentA++;
    }
    nextTabuada();
  } else {
    document.getElementById('tabuadaMessage').innerText = 'Resposta incorreta. Tente novamente.';
  }
}

// RANDOM
let randA, randB, randType;

function openRandomConfig() {
  showScreen('randomConfig');
}

function startRandom(type) {
  randType = type;
  showScreen('randomGame');
  generateRandom();
}

function generateRandom() {
  randA = Math.floor(Math.random() * 20) + 1;
  randB = Math.floor(Math.random() * 20) + 1;

  let symbol = '+';

  if (randType === 'mul') symbol = '×';
  if (randType === 'div') {
    randA = randA * randB;
    symbol = '÷';
  }

  document.getElementById('randomAnswer').value = '';
  document.getElementById('randomMessage').innerText = '';
  document.getElementById('randomOperation').innerText = `${randA} ${symbol} ${randB} = ?`;
}

function checkRandom() {
  const answer = Number(document.getElementById('randomAnswer').value);
  let correct;

  if (randType === 'sum') correct = randA + randB;
  if (randType === 'mul') correct = randA * randB;
  if (randType === 'div') correct = randA / randB;

  if (answer === correct) {
    generateRandom();
  } else {
    document.getElementById('randomMessage').innerText = 'Resposta incorreta.';
  }
}
