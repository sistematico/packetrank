#!/usr/bin/env bash

NAME="packetrank"
TMPDIR="/tmp/$NAME"
WORKDIR="/var/www/$NAME"
SERVICE="${NAME}.service"
PATH=$PATH:/home/nginx/.local/share/pnpm

echo "📦 Preparando ambiente de deploy..."

[ -e $TMPDIR ] && rm -rf $TMPDIR
[ -e $WORKDIR ] && cp -af $WORKDIR $TMPDIR
cd $TMPDIR || exit 1

#git clean -fxd -e .env -e drizzle/local.db
git clean -fxd -e .env
cp .env .env.production

echo "📥 Instalando dependências..."
pnpm install

echo "🗃️ Sincronizando banco de dados..."
pnpm run push
pnpm run seed

if pnpm run build; then
  echo "✅ Build concluído com sucesso!"
  sudo /usr/bin/systemctl stop $SERVICE
  [ -e $WORKDIR ] && rm -rf $WORKDIR
  [ -e $TMPDIR ] && cp -af $TMPDIR $WORKDIR

  echo "✅ Configurando contexto SELinux para /opt/packetrank..."
  sudo /usr/sbin/semanage fcontext -a -t httpd_sys_content_t "/opt/packetrank(/.*)?" 2> /dev/null
  sudo /usr/sbin/restorecon -R /opt/packetrank 2> /dev/null
  sudo /usr/sbin/restorecon -Rv /home/nginx/.local/share/pnpm/
 
  # ou force o tipo executável
  #sudo /usr/bin/chcon -t bin_t /home/nginx/.local/share/pnpm/pnpm

  sudo /usr/bin/systemctl start $SERVICE
  echo "🚀 Serviço reiniciado!"
fi