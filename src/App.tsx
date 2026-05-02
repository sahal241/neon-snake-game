/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import SnakeGame from './components/SnakeGame';

export default function App() {
  return (
    <div className="min-h-screen bg-black text-white font-sans flex items-center justify-center p-4 selection:bg-green-500/30">
      <div className="w-full absolute inset-0 sm:bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-900/10 via-black to-black pointer-events-none" />
      <div className="w-full z-10 flex flex-col items-center">
        <header className="mb-6 text-center">
        </header>
        <SnakeGame />
      </div>
    </div>
  );
}
