<div align="center">
<h1>🐍 Neon Snake Game</h1>
<p>A vibrant, high-energy Snake game with a futuristic neon aesthetic powered by AI Studio</p>
</div>

---

## 📖 About

**Neon Snake Game** is a modern take on the classic Snake arcade game, featuring stunning neon visuals and smooth gameplay. Built with Node.js and enhanced with AI capabilities through Google's Gemini API, this game brings the nostalgia of retro gaming to the modern web with an electrifying visual experience.

### ✨ Features

- 🎮 **Classic Snake Gameplay** - Navigate your snake to collect food and grow longer
- 💡 **Neon Visual Effects** - Eye-catching neon colors and modern UI design
- 🤖 **AI-Powered** - Integration with Google Gemini API for intelligent features
- 📱 **Responsive Design** - Play on desktop and mobile devices
- ⚡ **Smooth Performance** - Optimized for fast and fluid gameplay
- 🎯 **Score Tracking** - Keep track of your high scores and progress

---

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- npm (comes with Node.js)
- Google Gemini API Key

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/sahal241/neon-snake-game.git
   cd neon-snake-game
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure your environment:**
   - Create or edit `.env.local` file in the root directory
   - Add your Gemini API key:
     ```
     GEMINI_API_KEY=your_api_key_here
     ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   - Navigate to `http://localhost:3000` (or the port shown in your terminal)
   - Start playing! 🎮

---

## 🎮 How to Play

- **Arrow Keys** or **WASD** - Control the snake's direction
- **Space Bar** - Pause/Resume the game
- **Collect** the glowing food items to grow your snake
- **Avoid** running into walls or yourself
- **Beat** your high score!

---

## 📁 Project Structure

```
neon-snake-game/
├── public/              # Static assets
├── src/                 # Source code
│   ├── components/      # React/UI components
│   ├── utils/          # Utility functions
│   └── styles/         # CSS and styling
├── .env.local          # Environment variables (not committed)
├── package.json        # Project dependencies
└── README.md          # This file
```

---

## 🛠️ Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run linter |

---

## 🤖 AI Integration

This game leverages Google's Gemini API to provide:
- **Intelligent hints** during gameplay
- **Personalized challenges** based on your performance
- **Dynamic difficulty adjustment**
- **Game analysis and statistics**

---

## 🎨 Customization

### Colors & Styling
Edit the color variables in `src/styles/` to customize the neon aesthetic.

### Game Difficulty
Adjust game parameters in `src/utils/gameConfig.js`:
- `INITIAL_SPEED` - Starting snake speed
- `SPEED_INCREMENT` - Speed increase per food collected
- `GRID_SIZE` - Game board dimensions

---

## 📦 Dependencies

- **React** - UI framework
- **Node.js** - Runtime environment
- **Google Generative AI (Gemini)** - AI capabilities
- Additional dependencies listed in `package.json`

---

## 🐛 Troubleshooting

### API Key not recognized
- Ensure `.env.local` file exists in the root directory
- Verify the `GEMINI_API_KEY` is set correctly
- Restart the development server after updating `.env.local`

### Game not loading
- Check that all dependencies are installed: `npm install`
- Ensure Node.js version is v14 or higher: `node --version`
- Clear browser cache and refresh the page

### Port already in use
- Change the port in your development command or kill the process using that port

---

## 📝 License

This project is open source and available under the MIT License.

---

## 🙌 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests

---

## 👤 Author

**sahal241** - GitHub Profile

---

## 🎯 View Live

Experience the game in AI Studio: https://ai.studio/apps/aec18915-468c-4098-8ca4-13be3f55c34e

---

<div align="center">
  <p><strong>Made with 💚 and neon vibes</strong></p>
  <p>If you enjoyed this game, please give it a ⭐ on GitHub!</p>
</div>
