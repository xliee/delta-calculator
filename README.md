# Delta Calculator

A web-based tool for calculating kinematics and dimensions of delta 3D printers. This interactive calculator helps you design and optimize delta printer configurations with real-time 3D visualization.

## Features

- **3D Visualization**: Interactive Three.js model of your delta printer
- **Real-time Calculations**: Instant kinematic and build volume analysis
- **Multiple Effector Types**: Standard, E3D V6, Smart Effector, and custom configurations
- **Preset Configurations**: Kossel Mini, Standard, XL, and Anycubic Linear+ presets
- **Build Volume Analysis**: Visual constraints and printable area calculations
- **Parameter Validation**: Automatic validation prevents invalid configurations

## Installation

### Prerequisites
- Node.js 24
- Modern web browser with WebGL support

### Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/xliee/delta-calculator.git
   cd delta-calculator
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:3000`

### Build for Production
```bash
npm run build
npm run preview
```

## Usage

1. **Select a Preset**: Start with a known printer configuration (Kossel Mini, Standard, XL, or Anycubic Linear+)
2. **Adjust Parameters**: Use sliders to modify tower radius, height, rod spacing, and effector settings
3. **Choose Effector Type**: Select appropriate effector configuration
4. **Analyze Results**: Review build volume, constraints, and kinematic limits

### Controls
- **Mouse**: Rotate, zoom, and pan the 3D view
- **Sliders**: Real-time parameter adjustment
- **Keyboard**: Arrow keys for effector movement

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Three.js community for excellent 3D graphics library
- Delta printer community for mechanical insights
- Open source 3D printing projects for inspiration
- [Thinkyhead's Delta Robot Calculator](https://www.thinkyhead.com/_deltabot/)
- [Danalspub's Delta Kossel Calculator](https://web.archive.org/web/20200813115636/http://danalspub.com/DKcalc/) -  ([archived site](https://web.archive.org/web/20211129104150/http://danalspub.com/))

## Support and Contributions

For issues, feature requests, or contributions, please open an issue or pull request on GitHub.

---

**Delta Calculator** - Precision tools for delta printer design and optimization.
