# VPN Helper

Forti mu suka down? Suka mengambil alih jendela yang sedang tampil? Suka tiba-tiba membuka jendela baru padahal lagi fokus kerja? Susah ditakedown?

Coba pake ini. Aku ga jamin anti down, tapi ini ga semaruk Forti dalam menggunakan resource dan jaringan PC mu. Also, dia ga akan ujug-ujug buka tab SSO ketika koneksi VPN naik-turun.

[Langsung ke Persiapan](#persiapan)

---
## Ini Apa?
Intinya ini VPN pengganti Forticlient, ngaturnya lewat browser.

---
## ANNOUNCEMENT
VPN Helper dibuat dengan satu tolok ukur: _fast and reliable_. Seiring migrasi BPS RI ke GlobalProtect, integrasi protokol baru ini sedang diuji hingga batas evaluasi 31 Desember 2026. Apabila aplikasi resmi GlobalProtect pada saat itu terbukti sudah mampu memenuhi standar _fast and reliable_ tersebut secara mandiri, maka fungsi VPN Helper telah usai dan proyek ini akan dipensiunkan (deprecated) karena tujuannya telah tercapai.

---

## Changelog

| Versi | Perubahan |
| --- | --- |
| `1.26.0522` | Menambahkan config versi aplikasi.<br>Menyiapkan updater otomatis dari GitHub. |
| `1.26.0627.lt` | Modul terpisah |
| `1.26.0629.lt` | Memperbaiki kegagalan redirect ke link callback |
| `1.26.0708.lt` | Systray fix |
| `1.26.0903.pc` | Perbaikan automate yang gagal jalan secara otomatis |
| `1.26.0905.lt` | Perbaikan automasi yang kadang gagal berjalan, perbaikan file enkripsi |
| `1.26.0914.lt` | Menambahkan uji coba akomodasi pengguna ber-OTP |
| `1.26.0914.lt2` | Implementasi bypass aplikasi. Aplikasi yang koneksinya terputus/timeout gara-gara dialihkan ke VPN Helper bisa dimasukkan ke daftar bypass ini. |
| `1.26.0924.pc` | Menambahkan fungsi eksperimental untuk VPN GlobalProtect. Fitur ini belum bisa dipakai maksimal mengingat transisi VPN yang masih berjalan di pusat. |

---
## Extras
VPN itu pada dasarnya bikin tunnel: jalur khusus dari komputer kita ke jaringan tujuan. Aplikasi ini ngurus login SSO dan sesi gateway-nya, tapi tetap butuh mesin tunnel yang beneran mengangkat traffic jaringan. Mesin itu namanya OpenConnect.

Silakan ikuti langkah menginstal OpenConnect di section [**Persiapan**](#persiapan).


Nyariin fitur ini ya?

![Fitur Automate VPN Connectioon](assets/automate.png)

Fitur itu udah terinstal di VPN Helper mu tanpa kamu sadari. Kalo mo diaktifkan, chat wa aku ya. Ohiya FYI, fitur ini useless kalo kamu pake OTP. Jadi kalo ber-OTP, cuma bisa mode biasa ya ges.

---
## DISCLAIMER
Aplikasi ini dirilis di 19 Mei 2026. sudah melalui berbagai stress test dari beberapa pengguna, sehingga versinya terus terus lebih baik dari sebelumnya hingga hari ini. dengan menggunakannya, anda juga secara tidak langsung berpartisipasi dalam uji stres. sangat dianjurkan untuk secara aktif melaporkan bug yang anda temui, biar VPN Helper semakin baik lagi.

---
## Persiapan

1. Clone repo ini atau download ZIP-nya, lalu ekstrak ke folder pilihanmu.

2. Pastikan Python sudah terinstal.

   Biasalah, seluruh app ku pake Python.

3. Install OpenConnect.

   Windows:

   `requirements.bat` akan otomatis mendownload installer OpenConnect jika belum terpasang. Namun jika ingin mendownload manual, gunakan link berikut:
   - [Direct OpenConnect 64-bit installer](https://www.infradead.org/openconnect-gui/download/openconnect-gui-1.6.2-win64.exe)

   Saat jendela installer tampil (baik dari `requirements.bat` maupun manual), pastikan centang opsi **console**.

   ![Centang console OpenConnect](assets/ceklis%20console.png)

   Setelah install, pastikan `.env` mengarah ke binary CLI-nya:

   ```env
   openconnect_path=C:\Program Files\OpenConnect-GUI\openconnect.exe
   ```

   Cek versinya dari PowerShell:

   ```powershell
   & "C:\Program Files\OpenConnect-GUI\openconnect.exe" --version
   ```

   Pastikan yang keluar versi `v9.12` atau 9.x lain, bukan di bawah 9.x.


   Kalau pakai lokasi custom, cukup ganti nilai `openconnect_path` di file `.env`.

   Ubuntu/Debian:

   ```bash
   sudo apt install openconnect
   ```

   Fedora:

   ```bash
   sudo dnf install openconnect
   ```

   Arch:

   ```bash
   sudo pacman -S openconnect
   ```

   macOS:

   ```bash
   brew install openconnect
   ```

4. Install dependensi Python.

   Windows:

   ```bat
   requirements.bat
   ```

   Mac/Linux:

   ```bash
   sh requirements.sh
   ```

   Kalau dependensinya sudah ada, dia tidak install ulang. Kalau sukses, file installer itu akan menghapus dirinya sendiri setelah 3 detik. Kalau Python belum terinstal, dia cuma ngasih tahu lalu keluar tanpa menghapus dirinya.

 5. Persiapan berkas `.env`.

   Saat pertama kali me-run aplikasi via `run.bat`, sistem akan mendeteksi jika berkas `.env` belum ada. Aplikasi akan mengajukan pertanyaan yang hanya bisa dijawab oleh pegawai BPS. Jawab pakai huruf kecil semua.


6. Jalankan aplikasi.

   Windows:

   ```bat
   run.bat
   ```

   Mac/Linux:

   ```bash
   sh run.sh
   ```

7. Akses di http://localhost:8765

8. Ada 3 status di aplikasi:

   - SSO: hijau kalau login SSO sudah selesai dan app menerima Authentication ID.
   - Gateway: hijau kalau Authentication ID sudah ditukar menjadi sesi SSL-VPN dan konfigurasi gateway berhasil dibaca.
   - VPN: hijau kalau tunnel OpenConnect sudah aktif.

   Tombolnya sederhana:

   - `Connect`: menjalankan SSO, menyiapkan Gateway, lalu otomatis menjalankan tunnel VPN.
   - `Disconnect`: memutus tunnel VPN dan membersihkan sesi SSO/Gateway, supaya connect berikutnya mulai dari sesi baru.

---

## QnA
Feel free to reach me out via WhatsApp.

---

## License

This project is distributed under the VPN Helper Use-Only License.

Use of this software is free of charge. Modification, publication of modified versions, sublicensing, selling, renting, or repackaging requires prior written permission from the copyright holder.

See [LICENSE](LICENSE) for the full English and Indonesian license text.
