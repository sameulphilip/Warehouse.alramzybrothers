const fs = require('fs');
const pngToIco = require('png-to-ico');
pngToIco('icon.png').then((buf) => {
  fs.writeFileSync('icon.ico', buf);
  console.log('ico', buf.length);
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
