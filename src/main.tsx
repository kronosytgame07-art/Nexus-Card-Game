import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import App from './App';
import { FactionUnlockShop } from './components/FactionUnlockShop';
import { installFactionUnlockRules } from './progression/faction-unlocks';
import './styles.css';
import './arena.css';
import './mobile-fixes.css';
import './faction-vfx.css';
import './cinematics.css';
import './faction-unlocks.css';

const isInteractiveGameElement = (target: EventTarget | null) =>
  target instanceof Element &&
  Boolean(target.closest('#root button, #root a, #root .card, #root .field-card, #root .field-unit, #root .menu-card, #root .card-pile, #root img'));

document.addEventListener('contextmenu', (event) => {
  if (isInteractiveGameElement(event.target)) event.preventDefault();
});

document.addEventListener('dragstart', (event) => {
  if (isInteractiveGameElement(event.target)) event.preventDefault();
});

document.addEventListener('selectstart', (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (target.closest('input, textarea, [contenteditable="true"]')) return;
  if (target.closest('#root')) event.preventDefault();
});

installFactionUnlockRules();

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
      <FactionUnlockShop />
    </BrowserRouter>
  </React.StrictMode>
);

if ('serviceWorker' in navigator && !Capacitor.isNativePlatform()) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}
