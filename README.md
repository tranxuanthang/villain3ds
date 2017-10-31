# villain3ds

Download 3DS games to your PC as .cia files.

## To Use

To clone and run this repository you'll need [Git](https://git-scm.com) and [Node.js](https://nodejs.org/en/download/) (which comes with [npm](http://npmjs.com)) installed on your computer. From your command line:

```bash
# Clone this repository
git clone https://github.com/tranxuanthang/villain3ds
# Go into the repository
cd villain3ds
# Install dependencies
npm install
# Run the app
npm start
```

## Package

Run those commands:

```bash
# Go into the repository
cd villain3ds
# For Windows (32 bit)
npm run package-win
# For Windows (64 bit)
npm run package-win64
# For linux (64 bit)
npm run package-linux
# For macOS (64 bit)
npm run package-mac
```
Output is at `../release-builds`.
