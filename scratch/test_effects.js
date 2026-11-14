const { execFile } = require('child_process');
const ffmpeg = 'C:\\Users\\Muhammad Hashim\\AppData\\Local\\Programs\\Python\\Python314\\Lib\\site-packages\\static_ffmpeg\\bin\\win32\\ffmpeg.EXE';

const filters = [
  'vignette=angle=0.5',
  'gblur=sigma=2.0',
  'unsharp=luma_msize_x=5:luma_msize_y=5:luma_amount=1.5',
  'noise=alls=15:allf=t+u',
  'rgbashift=rh=4:bv=-4',
  "curves=all='0/0 0.5/0.65 1/1'",
  'colorchannelmixer=rr=1.2:rg=0.08:rb=0.15'
];

execFile(ffmpeg, [
  '-f', 'lavfi', '-i', 'color=c=blue:s=320x240:d=1',
  '-vf', filters.join(','),
  '-frames:v', '1', '-y', 'scratch/test_all_effects.png'
], (err, stdout, stderr) => {
  if (err) {
    console.error('EFFECTS ERROR:', err.message);
    console.error(stderr);
  } else {
    console.log('ALL EFFECTS SUCCESS!');
  }
});
