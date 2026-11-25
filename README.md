# NIER IT Solutions website (Cloudflare Pages + D1)

May **admin page** (`/admin`), **database ng quote requests**, **Testimonials tab** at **Gallery uploads**.

## Ano ang nasa package
- Walong pampublikong page + `testimonials.html` (bago), `404.html`, `admin.html`.
- `functions/`: ang backend (Cloudflare Pages Functions). Dito dumadaan ang quote form, mga testimonial, gallery at ang admin.
- `schema.sql`: ang istruktura ng database (D1).
- `assets/`: CSS, JavaScript at mga larawan.

## Paano i-set up (isang beses lang)

### 1. Gumawa ng database (D1)
1. Cloudflare dashboard, hanapin ang D1 (Storage and Databases), Create database. Pangalan: `nier-db`.
2. Buksan ang database, pumunta sa Console, i-paste ang buong laman ng `schema.sql`, at i-execute.

### 2. I-deploy sa Cloudflare Pages gamit ang GitHub
Ang `functions/` folder ay kailangan ng Git integration (o ng Wrangler CLI). Hindi ito pinoproseso ng simpleng drag-and-drop upload, kaya huwag iyon ang gamitin ngayon.
1. I-push ang buong laman ng folder na ito sa isang GitHub repo. Nasa root ng repo ang `index.html`.
2. Workers and Pages, Create, Pages, Connect to Git, piliin ang repo.
3. Framework preset: None. Build command: iwanang blangko. Build output directory: `/`.

### 3. Ikonekta ang database at maglagay ng password
Sa Pages project, buksan ang Settings:
1. **Bindings** (Functions): magdagdag ng D1 database binding. Variable name: `DB`. Piliin ang `nier-db`.
2. **Variables and Secrets**: magdagdag ng dalawang secret:
   - `ADMIN_PASSWORD`: ang password mo sa admin (mahaba at mahirap hulaan).
   - `SESSION_SECRET`: kahit anong random na teksto na 32 titik o higit pa.
3. I-redeploy ang project (halimbawa, mag-push ng maliit na pagbabago o piliin ang Retry deployment). Gumagana lang ang mga bagong binding at secret sa susunod na deployment.

(Maaaring bahagyang mag-iba ang pangalan ng mga menu sa dashboard.)

### 4. Subukan
- Buksan ang `https://iyong-site/admin` at mag-login.
- Magpadala ng test na quote sa Contact page. Dapat lumabas ito sa Quote requests.
- Hangga't hindi pa nakakabit ang database, ang quote form ay magsasabing gamitin ang Email, Messenger o Viber.

## Paano gamitin ang admin
- **Quote requests**: makikita ang lahat ng nag-request, may status (New, Contacted, Quoted, Won, Closed), private notes, paghahanap at Export CSV. May badge sa tab para sa mga bago.
- **Testimonials**: magdagdag ng sarili mong testimonial (may rating at larawan), i-hide o i-publish, i-edit o i-delete. Ang mga isinumite ng kliyente sa Testimonials page ay lalabas dito bilang **Needs review**. Hindi ito makikita ng publiko hangga't hindi mo pinipindot ang Publish.
- **Gallery photos**: mag-upload ng larawan, lagyan ng caption at category. Awtomatikong pinaliliit ang larawan bago i-upload. Lalabas ito sa unahan ng Gallery page. Ang orihinal na 20 larawan ay bahagi ng mga file ng website.
- Ang mga pagbabago ay lumalabas sa publiko sa loob ng mga isang minuto (may cache).

## Seguridad
- Ang admin ay may password, limitasyon sa maling subok (5 sa loob ng 10 minuto) at proteksyon laban sa pekeng request. Ang quote form ay may proteksyon laban sa spam at limitasyon sa dalas.
- **Mas matibay na opsyon (inirerekomenda):** gamitin ang Cloudflare Access (Zero Trust) para sa `/admin*` at `/api/admin/*`, para email code ang kailangan bago pa makita ang login. Libre ito para sa maliit na grupo.
- Ang quote requests ay may personal na impormasyon (pangalan, telepono, email). Maglagay ng maikling privacy notice sa site at magpakonsulta sa abogado ayon sa Data Privacy Act.
- Regular na i-export ang CSV bilang backup.

## Limitasyon
- Ang mga larawang ina-upload sa admin ay itinatago sa database (hindi sa hiwalay na file storage), kaya iniiwasan ang karagdagang setup. Maayos ito para sa dose-dosenang larawan. Kung dadami nang husto, ilipat sa R2.
- Ang Featured products, mga serbisyo, FAQ at iba pang teksto ay nasa `assets/app.*.js`. Hindi pa ito naeedit sa admin.
- Walang awtomatikong email notification kapag may bagong quote. Tingnan ang admin, o hilingin sa akin na idagdag ito.

## Dapat tiyakin
- Totoo ba ang "DTI and BIR registered", "Nationwide delivery" at "Genuine products"?
- Tama pa ba ang mga specs sa Featured products?
- Palitan ang `YOUR-DOMAIN` sa `robots.txt` at `sitemap.xml` kapag may domain na.
