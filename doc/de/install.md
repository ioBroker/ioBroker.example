# Hinweise

## Blaues Licht abschalten

* von Forumsmitglied robudus:

in der /etc/rc.local

echo '0a v' > /dev/serial/by-id/usb-FTDI_FT232R_USB_UART_AI03DA2L-if00-port0

unter /dev/serial/by-id sind auch andere Geräte zu sehen. Entsprechend auf den Jeelink anpassen.

## image brennen
