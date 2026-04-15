window.requestAnimationFrame =
    window.__requestAnimationFrame ||
    window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    (function () {
        return function (callback, element) {
            var lastTime = element.__lastTime;
            if (lastTime === undefined) {
                lastTime = 0;
            }
            var currTime = Date.now();
            var timeToCall = Math.max(1, 33 - (currTime - lastTime));
            window.setTimeout(callback, timeToCall);
            element.__lastTime = currTime + timeToCall;
        };
    })();

window.isDevice =
    (/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(((navigator.userAgent
        || navigator.vendor || window.opera)).toLowerCase()));

var loaded = false;
var init = function () {
    if (loaded) return;
    loaded = true;
    var mobile = window.isDevice;

    var dpr = window.devicePixelRatio || 1;
    var inputKoef = dpr;
    var koef = 1;

    function updateScale() {
        var minCSS = Math.min(innerWidth, innerHeight);
        var relative = Math.min(1.5, minCSS / 800); // 800px base standard height limit
        koef = relative * dpr;
    }
    updateScale();

    // KATMAN 1: İZ (TRAIL) BIRAKAN KALP EFEKTLERİ İÇİN
    var canvas = document.getElementById('heart');
    var ctx = canvas.getContext('2d');

    // KATMAN 2: NET, İZ BIRAKMAYAN OYUN NESNELERİ İÇİN (Boğa, Sapan, Yazı)
    var canvas2 = document.createElement('canvas');
    canvas2.style.position = 'absolute';
    canvas2.style.left = '0';
    canvas2.style.top = '0';
    canvas2.style.width = '100%';
    canvas2.style.height = '100%';
    canvas2.style.pointerEvents = 'none'; // Fare etkileşimi alttaki orijinal sisteme ulaşsın
    document.body.appendChild(canvas2);
    var ctx2 = canvas2.getContext('2d');

    var width = canvas.width = canvas2.width = inputKoef * innerWidth;
    var height = canvas.height = canvas2.height = inputKoef * innerHeight;
    var rand = Math.random;

    let mouseX = width / 2, mouseY = height / 2;
    let isDragging = false;
    let gameState = 'intro'; // Başlangıçta giriş ekranı görünsün
    let arrowsFired = 0; 

    // Giriş Pop-up'ı Kontrolü
    const startBtn = document.getElementById('start-btn');
    const startAction = function(e) {
        if (e) e.preventDefault();
        if (gameState !== 'intro') return; // Birden fazla kez tetiklenmesini önle
        
        const overlay = document.getElementById('intro-overlay');
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.style.display = 'none';
            gameState = 'playing';
        }, 500);
    };

    startBtn.addEventListener('click', startAction);
    startBtn.addEventListener('touchend', startAction);

    function updateMouse(e) {
        mouseX = e.clientX * inputKoef;
        mouseY = e.clientY * inputKoef;
    }

    function fireArrow() {
        if (!isDragging) return;
        isDragging = false;

        let bowX = width / 2;
        let bowY = height - (120 * koef); // Yay daha yukarı taşındı (40'tan 120'ye)

        let dx = bowX - mouseX;
        let dy = bowY - mouseY;

        let finalAimAngle = Math.atan2(dy, dx);
        let finalStretch = Math.min(100 * koef, Math.hypot(dx, dy));

        if (finalStretch > 15 * koef && !arrow.active) {
            arrow.active = true;
            arrow.hasDodged = false; // Her atış yapıldığında kaçış hakkını yenile
            arrowsFired++; // Limit için ok sayacını artır

            arrow.x = bowX;
            arrow.y = bowY;
            let speed = (finalStretch / (2 * koef)) + 12 * koef;
            arrow.vx = Math.cos(finalAimAngle) * speed;
            arrow.vy = Math.sin(finalAimAngle) * speed;
            arrow.angle = finalAimAngle;
        }
    }

    window.addEventListener('mousedown', e => {
        if (gameState !== 'playing') return;
        updateMouse(e);
        if (mouseY > height * 0.5) isDragging = true;
    });

    window.addEventListener('mousemove', e => updateMouse(e));

    window.addEventListener('mouseup', e => fireArrow());

    window.addEventListener('touchstart', e => {
        if (gameState !== 'playing') return;
        e.preventDefault();
        mouseX = e.touches[0].clientX * inputKoef;
        mouseY = e.touches[0].clientY * inputKoef;
        if (mouseY > height * 0.4) isDragging = true;
    }, { passive: false });

    window.addEventListener('touchmove', e => {
        if (!isDragging) return;
        e.preventDefault();
        mouseX = e.touches[0].clientX * inputKoef;
        mouseY = e.touches[0].clientY * inputKoef;
    }, { passive: false });

    window.addEventListener('touchend', e => {
        e.preventDefault();
        fireArrow();
    }, { passive: false });

    var heartPosition = function (rad) {
        return [Math.pow(Math.sin(rad), 3),
        -(15 * Math.cos(rad) - 5 *
            Math.cos(2 * rad) - 2 *
            Math.cos(3 * rad) - Math.cos(4 * rad))];
    };
    var scaleAndTranslate = function (pos, sx, sy, dx, dy) {
        return [dx + pos[0] * sx, dy + pos[1] * sy];
    };

    window.addEventListener('resize', function () {
        updateScale();
        width = canvas.width = canvas2.width = inputKoef * innerWidth;
        height = canvas.height = canvas2.height = inputKoef * innerHeight;
        ctx.fillStyle = "rgba(0,0,0,1)";
        ctx.fillRect(0, 0, width, height);
    });

    var traceCount = mobile ? 20 : 50;
    var pointsOrigin = [];
    var i;
    var dr = mobile ? 0.3 : 0.1;
    for (i = 0; i < Math.PI * 2; i += dr)
        pointsOrigin.push(scaleAndTranslate(heartPosition(i), 210, 13, 0, 0));
    for (i = 0; i < Math.PI * 2; i += dr)
        pointsOrigin.push(scaleAndTranslate(heartPosition(i), 150, 9, 0, 0));
    for (i = 0; i < Math.PI * 2; i += dr)
        pointsOrigin.push(scaleAndTranslate(heartPosition(i), 90, 5, 0, 0));
    var heartPointsCount = pointsOrigin.length;

    var targetPoints = [];
    var pulse = function (kx, ky) {
        let t_time = Date.now() / 1000;
        for (i = 0; i < pointsOrigin.length; i++) {
            targetPoints[i] = [];
            // Scale the heart dynamically according to the responsive koef
            let tx = kx * pointsOrigin[i][0] * koef + width / 2;
            let ty = ky * pointsOrigin[i][1] * koef + height / 2;

            if (gameState === 'playing' || gameState === 'intro') {
                let distToMouse = Math.hypot(tx - mouseX, ty - mouseY);
                let mouseInf = Math.max(0, 300 * koef - distToMouse) / (300 * koef);
                if (mouseInf > 0 && !isDragging) {
                    let wave = Math.sin(i * 10 - t_time * 15) * (40 * koef) * mouseInf;
                    let angle = Math.atan2(ty - height / 2, tx - width / 2);
                    tx += Math.cos(angle) * wave;
                    ty += Math.sin(angle) * wave;
                }
            }
            targetPoints[i][0] = tx;
            targetPoints[i][1] = ty;
        }
    };

    var e = [];
    for (i = 0; i < heartPointsCount; i++) {
        var x = rand() * width;
        var y = rand() * height;
        e[i] = {
            vx: 0,
            vy: 0,
            R: 2,
            speed: (rand() + 5) * koef,
            q: ~~(rand() * heartPointsCount),
            D: 2 * (i % 2) - 1,
            force: 0.2 * rand() + 0.7,
            f: "hsla(0," + ~~(40 * rand() + 60) + "%," + ~~(60 * rand() + 20) + "%,.3)",
            trace: []
        };
        for (var k = 0; k < traceCount; k++) e[i].trace[k] = { x: x, y: y };
    }


    // ================= BOĞA, YAY & OK =================

    class HeartTarget {
        constructor() {
            this.x = rand() > 0.5 ? -50 : width + 50;
            this.y = rand() * height;
            this.angle = rand() * Math.PI * 2;
            this.baseSpeed = (5.5 + rand() * 4.0) * koef;
            this.speed = this.baseSpeed;
            this.isReturning = false;
        }
        update() {
            let distToCenter = Math.hypot(width / 2 - this.x, height / 2 - this.y);

            if (!this.isReturning && distToCenter > 240 * koef && rand() < 0.035) {
                this.isReturning = true;
            }

            if (this.speed > this.baseSpeed) {
                this.speed -= 0.05 * koef;
            }

            if (this.isReturning) {
                if (distToCenter < 190 * koef && distToCenter > 130 * koef && rand() < 0.05) {
                    this.isReturning = false;
                    this.angle += (rand() > 0.5 ? 1 : -1) * (Math.PI / 2 + rand());
                    this.speed = this.baseSpeed * 1.5;
                } else {
                    let angleToTarget = Math.atan2(height / 2 - this.y, width / 2 - this.x);
                    let angleDiff = angleToTarget - this.angle;
                    angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
                    this.angle += angleDiff * 0.08;
                    this.angle += (rand() - 0.5) * 0.2;
                }

                if (distToCenter < 110 * koef) {
                    this.isReturning = false;
                }
            } else {
                if (distToCenter < 150 * koef) {
                    this.angle += (rand() - 0.5) * 0.6;
                    if (rand() < 0.08) {
                        this.angle += (rand() > 0.5 ? 1 : -1) * (Math.PI / 2 + (rand() * 0.5));
                        this.speed = this.baseSpeed * 1.3;
                    }
                } else {
                    this.angle += (rand() - 0.5) * 0.3;
                    if (rand() < 0.04) this.angle += (rand() - 0.5) * Math.PI;
                }
            }

            this.x += Math.cos(this.angle) * this.speed;
            this.y += Math.sin(this.angle) * this.speed;

            if (this.x < -150) this.x = width + 150;
            if (this.x > width + 150) this.x = -150;
            if (this.y < -150) this.y = height + 150;
            if (this.y > height + 150) this.y = -150;
        }
        draw(context) {
            context.save();
            context.translate(this.x, this.y);

            // ATAN KALP (PULSING) EFEKTİ - Daha Büyük
            let pulse = 1 + Math.sin(Date.now() / 150) * 0.2;
            context.scale(pulse * koef * 3.5, pulse * koef * 3.5);

            context.beginPath();
            context.moveTo(0, 0);
            context.bezierCurveTo(-5, -5, -10, 5, 0, 15);
            context.bezierCurveTo(10, 5, 5, -5, 0, 0);

            context.fillStyle = '#ff0000'; // Neon Kırmızı
            context.shadowBlur = 25;
            context.shadowColor = '#ff0000';
            context.fill();

            // Parlak Kenar
            context.strokeStyle = "rgba(255, 255, 255, 0.5)";
            context.lineWidth = 0.4;
            context.stroke();

            context.restore();
        }

        drawTailPuff(context, x, y, size) {
            context.save();
            context.translate(x, y);
            context.scale(size, size);
            context.fillStyle = '#ff0000';
            context.beginPath();
            context.moveTo(0, 0);
            context.bezierCurveTo(-5, -5, -10, 5, 0, 15);
            context.bezierCurveTo(10, 5, 5, -5, 0, 0);
            context.fill();
            context.restore();
        }
    }

    const myTargetHeart = new HeartTarget();

    const arrow = {
        active: false,
        hasDodged: false,
        x: 0, y: 0,
        vx: 0, vy: 0,
        angle: 0,
        draw(context) {
            if (!this.active) return;
            context.save();
            context.translate(this.x, this.y);
            context.rotate(this.angle);
            context.scale(0.8, 0.8);

            context.beginPath();
            context.moveTo(-20 * koef, 0);
            context.lineTo(20 * koef, 0);
            context.moveTo(20 * koef, 0);
            context.lineTo(10 * koef, -6 * koef);
            context.moveTo(20 * koef, 0);
            context.lineTo(10 * koef, 6 * koef);

            context.lineWidth = 2 * koef;
            context.strokeStyle = '#fff';
            context.shadowBlur = 10;
            context.shadowColor = '#0ff';
            context.stroke();

            context.restore();
        },
        update() {
            if (!this.active) return;
            this.x += this.vx;
            this.y += this.vy;
            if (this.y < -100 || this.y > height + 100 || this.x < -100 || this.x > width + 100) {
                this.active = false;
                // ISKALAMA MESAJINI TETİKLE
                triggerMissMessage();
            }
        }
    };

    let missMessage = "";
    let missMessageTimer = 0;
    const teasingMessages = [
        "Aaa, ıskaladın mı canım askim?",
        "Biraz daha dikkat sevgilim! <3",
        "Kalbim çok hızlı kaçıyor değil mi?",
        "Nişan yeteneğin paslanmış mı ne? ",
        "Bu gidişle beni vurman biraz zor bebeğim!",
        "Bu sefer de olmadı aşkım!",
        "Kıyamam, yine mi kaçırdın? "
    ];

    function triggerMissMessage() {
        if (gameState !== 'playing') return;
        missMessage = teasingMessages[Math.floor(rand() * teasingMessages.length)];
        missMessageTimer = 120; // Yaklaşık 2 saniye ekranda kalsın
    }

    function drawMissMessage(context) {
        if (missMessageTimer > 0) {
            context.save();
            let alpha = Math.min(1.0, missMessageTimer / 30);
            context.globalAlpha = alpha;
            let fontSize = (mobile ? 20 : 35) * inputKoef;
            context.font = `italic bold ${fontSize}px 'Arial', sans-serif`;
            context.textAlign = "center";
            context.fillStyle = "#ff69b4";
            context.shadowBlur = 10;
            context.shadowColor = "#fff";
            context.fillText(missMessage, width / 2, height * 0.3);
            context.restore();
            missMessageTimer--;
        }
    }

    function drawBow(context) {
        context.save();
        let bowX = width / 2;
        let bowY = height - (120 * koef);
        context.translate(bowX, bowY);

        let aimAngle = -Math.PI / 2;
        let stretch = 0;

        if (isDragging) {
            let dx = bowX - mouseX;
            let dy = bowY - mouseY;
            aimAngle = Math.atan2(dy, dx);
            stretch = Math.min(60 * koef, Math.hypot(dx, dy));
        }

        context.rotate(aimAngle);
        context.beginPath();
        context.arc(0, 0, 45 * koef, Math.PI / 2, -Math.PI / 2, true);
        context.lineWidth = 3 * koef;
        context.strokeStyle = '#ffb6c1';
        context.shadowBlur = 10;
        context.shadowColor = '#ff69b4';
        context.stroke();
        context.shadowBlur = 0;

        context.beginPath();
        context.moveTo(0, -45 * koef);
        if (isDragging) {
            context.lineTo(-stretch, 0);
            context.lineTo(0, 45 * koef);
        } else {
            context.lineTo(0, 45 * koef);
        }
        context.lineWidth = typeof isDragging === 'boolean' && isDragging ? 1 : 1.5 * koef;
        context.strokeStyle = '#fff';
        context.stroke();

        if (isDragging && !arrow.active) {
            context.beginPath();
            context.moveTo(-stretch, 0);
            context.lineTo(25 * koef, 0);
            context.lineWidth = 2 * koef;
            context.strokeStyle = '#fff';
            context.stroke();

            context.moveTo(25 * koef, 0);
            context.lineTo(15 * koef, -5 * koef);
            context.moveTo(25 * koef, 0);
            context.lineTo(15 * koef, 5 * koef);
            context.stroke();
        }
        context.restore();
    }

    let explosionParticles = [];

    function drawMiniHeart(context, x, y, size, color, alpha) {
        context.save();
        context.translate(x, y);
        context.scale(size * koef, size * koef);
        context.globalAlpha = Math.max(0, alpha);
        context.fillStyle = color;
        context.beginPath();
        context.moveTo(0, 0);
        context.bezierCurveTo(-5, -5, -10, 5, 0, 15);
        context.bezierCurveTo(10, 5, 5, -5, 0, 0);
        context.fill();
        context.shadowBlur = 10;
        context.shadowColor = color;
        context.fill();
        context.restore();
    }

    function triggerExplosion(x, y) {
        gameState = 'hit';
        for (let j = 0; j < 400; j++) {
            let angle = rand() * Math.PI * 2;
            let speed = rand() * 25 * koef + 2;
            explosionParticles.push({
                x: x, y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed + (rand() - 0.5) * 5,
                size: rand() * 1.5 + 0.5,
                life: 1.0,
                decay: rand() * 0.015 + 0.005,
                color: `hsl(${Math.floor(rand() * 360)}, 100%, 65%)`
            });
        }
    }

    function updateAndDrawExplosion(context) {
        for (let j = explosionParticles.length - 1; j >= 0; j--) {
            let p = explosionParticles[j];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.3 * koef;
            p.life -= p.decay;

            if (p.life <= 0) {
                explosionParticles.splice(j, 1);
            } else {
                drawMiniHeart(context, p.x, p.y, p.size * (1 + (1 - p.life)), p.color, p.life);
            }
        }
    }

    function drawText(context) {
        context.save();
        let fontSize = (mobile ? 35 : 60) * inputKoef;
        context.font = `bold ${fontSize}px 'Georgia', serif`;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.shadowBlur = 30;
        context.shadowColor = "#ff4500";
        context.fillStyle = "#ffffff";
        let alphaScale = (Math.sin(Date.now() / 300) + 1) / 2 * 0.5 + 0.5;
        context.globalAlpha = alphaScale;

        // Saate göre mesaj mantığı
        let hour = new Date().getHours();
        let message = "Kalbimi tam 12'den vurdun. Seni Çok Seviyorum Bir Tanem";
        if (hour >= 20 || hour < 6) {
            message = "Kalbimi tam 12'den vurdun. İyi ki varsın bebeğim";
        } else if (hour >= 6 && hour < 15) {
            message = "Kalbimi tam 12'den vurdun. Tebrikler Canım Askim";
        } else if (hour >= 15 && hour < 20) {
            message = "Kalbimi tam 12'den vurdun. Aferin sevgilim başardın seni tekrar bekliyorum";
        }

        // Çok Satırlı Yazdırma (Ekrandan taşmaması için noktalardan bölüyoruz)
        let lines = message.split('. ');
        lines.forEach((line, index) => {
            let yOffset = (index - (lines.length - 1) / 2) * (fontSize * 1.2);
            context.fillText(line + (index < lines.length - 1 ? "." : ""), width / 2, height / 2 + yOffset);
        });
        context.restore();
    }

    var config = { traceK: 0.4, timeDelta: 0.01 };
    var time = 0;

    var loop = function () {
        // KATMAN 1 (Sadece Kalp İzleri İçin)
        ctx.fillStyle = "rgba(0,0,0,.15)";
        ctx.fillRect(0, 0, width, height);

        // KATMAN 2 (İz Bırakmayan Oyun Objeleri İçin Temizleme)
        ctx2.clearRect(0, 0, width, height);

        if (gameState === 'playing' || gameState === 'intro') {
            var n = -Math.cos(time);
            var currentScale = (1 + n) * .5;
            pulse(currentScale, currentScale);
            time += ((Math.sin(time)) < 0 ? 9 : (n > 0.8) ? .2 : 1) * config.timeDelta;

            // Orijinal Kalp Parçacıkları Çizimi (Trace'li Olan Layer)
            for (i = e.length; i--;) {
                var u = e[i];
                var q = targetPoints[u.q];
                var dx = u.trace[0].x - q[0];
                var dy = u.trace[0].y - q[1];
                var length = Math.sqrt(dx * dx + dy * dy);
                if (10 > length) {
                    if (0.95 < rand()) u.q = ~~(rand() * heartPointsCount);
                    else {
                        if (0.99 < rand()) u.D *= -1;
                        u.q += u.D;
                        u.q %= heartPointsCount;
                        if (0 > u.q) u.q += heartPointsCount;
                    }
                }
                u.vx += -dx / length * u.speed;
                u.vy += -dy / length * u.speed;
                u.trace[0].x += u.vx;
                u.trace[0].y += u.vy;
                u.vx *= u.force;
                u.vy *= u.force;
                for (var k = 0; k < u.trace.length - 1;) {
                    var T = u.trace[k];
                    var N = u.trace[++k];
                    N.x -= config.traceK * (N.x - T.x);
                    N.y -= config.traceK * (N.y - T.y);
                }
                ctx.fillStyle = u.f;
                for (k = 0; k < u.trace.length; k++) {
                    ctx.fillRect(u.trace[k].x, u.trace[k].y, 1, 1);
                }
            }
        }

        if (gameState === 'playing') {
            // Oyun Objeleri (Fizik Güncellemeleri Önce Yapılır)
            myTargetHeart.update();
            // ... (rest of the playing logic remains the same)

            if (arrow.active) {
                arrow.update();

                let distToHeart = Math.hypot(arrow.x - myTargetHeart.x, arrow.y - myTargetHeart.y);

                // ZORLUK SEVİYELERİ: İlk 15 atış "God Mode", Sonrası "Hard Mode"
                let isGodMode = arrowsFired <= 15;
                // 15 atıştan sonra bile %50 ihtimalle erken refleks ile kaçmaya çalışsın (Hemen kolayca teslim olmasın)
                let willTryDodge = isGodMode || (rand() < 0.50);

                if (willTryDodge && !arrow.hasDodged && distToHeart < 140 * koef) {
                    arrow.hasDodged = true; // Oku her geldiğinde sadece bir kere sezer
                    let escapeAngle = arrow.angle + (rand() > 0.5 ? 1.2 : -1.2) * (Math.PI / 2);
                    myTargetHeart.angle = escapeAngle;
                    // God moddaysa şimşek gibi (%320), değilse daha avlanabilir ölçüde (%200) kaçsın
                    myTargetHeart.speed = myTargetHeart.baseSpeed * (isGodMode ? 3.2 : 2.0);
                }

                // GÖRÜNMEZ FİZİKSEL KALKAN (İçinden Geçmeyi Önlemek İçin - Sadece İlk 15 Atış)
                if (isGodMode && distToHeart < 70 * koef) {
                    let pushAngle = Math.atan2(myTargetHeart.y - arrow.y, myTargetHeart.x - arrow.x);
                    myTargetHeart.x += Math.cos(pushAngle) * 14 * koef;
                    myTargetHeart.y += Math.sin(pushAngle) * 14 * koef;
                    // Okun gerçek temas hesabını yapabilmek için mesafeyi yenile
                    distToHeart = Math.hypot(arrow.x - myTargetHeart.x, arrow.y - myTargetHeart.y);
                }

                // ÇARPIŞMA (MERMİ TEMASI)
                if (distToHeart < 45 * koef) {
                    if (!isGodMode) {
                        // 15 LİMİTİ AŞILDI, ARTIK FİZİKSEL KALKAN YOK %100 GERÇEK VURUŞLAR TESPİT EDİLİR:
                        let distToHeartCenter = Math.hypot(myTargetHeart.x - width / 2, myTargetHeart.y - height / 2);
                        let currentHeartRadius = Math.max(30 * koef, 170 * koef * currentScale);

                        if (distToHeartCenter < currentHeartRadius) {
                            triggerExplosion(myTargetHeart.x, myTargetHeart.y);
                        } else {
                            arrow.active = false;
                        }
                    }
                }
            }

            // ÇİZİMLER (Fizik Hesaplamaları Bittikten SONRA çiziyoruz ki hatalı üst üste binme olmasın)
            myTargetHeart.draw(ctx2);
            drawBow(ctx2);
            if (arrow.active) arrow.draw(ctx2);
            drawMissMessage(ctx2);

        } else if (gameState === 'hit') {
            // Patlama Animasyonu ve Yazı
            updateAndDrawExplosion(ctx2);
            drawText(ctx2);
        }

        window.requestAnimationFrame(loop, canvas);
    };
    loop();
};

var s = document.readyState;
if (s === 'complete' || s === 'loaded' || s === 'interactive') init();
else document.addEventListener('DOMContentLoaded', init, false);
