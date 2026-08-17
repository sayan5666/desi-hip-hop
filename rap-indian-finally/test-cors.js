fetch('https://i.ytimg.com/vi/Rt9tW3cMLhI/hqdefault.jpg').then(r => console.log(r.headers.get('access-control-allow-origin'))).catch(console.error);
