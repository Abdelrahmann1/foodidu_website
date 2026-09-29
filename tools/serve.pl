# Local preview server that behaves like Firebase Hosting for this site.
#   perl tools/serve.pl [port]      -> http://localhost:5000/
# Serves public/ (dir index + 404.html, like Firebase). Dev-only extras, never deployed:
#   /__tools/*  -> tools/     /__legacy/* -> legacy/     /__static/* -> static/
#   POST /__save?path=static/...  writes the request body to that file (used by tools/assets.html)
use strict; use warnings;
use HTTP::Daemon; use HTTP::Response;
use File::Basename qw(dirname); use File::Path qw(make_path); use Cwd qw(abs_path);

my $port = shift // 5000;
my $root = abs_path(dirname(abs_path(__FILE__)) . '/..');
my %mime = (html=>'text/html; charset=utf-8', css=>'text/css; charset=utf-8', js=>'text/javascript; charset=utf-8',
  json=>'application/json', webmanifest=>'application/manifest+json', xml=>'application/xml; charset=utf-8', txt=>'text/plain; charset=utf-8',
  svg=>'image/svg+xml', png=>'image/png', jpg=>'image/jpeg', jpeg=>'image/jpeg', webp=>'image/webp', gif=>'image/gif', ico=>'image/x-icon',
  woff=>'font/woff', woff2=>'font/woff2');

my $d = HTTP::Daemon->new(LocalAddr=>'127.0.0.1', LocalPort=>$port, ReuseAddr=>1) or die "Cannot listen on $port: $!";
$| = 1; print "Serving $root/public at http://localhost:$port/\n";

sub file_res {
  my ($file, $code) = @_;
  open my $fh, '<:raw', $file or return;
  local $/; my $body = <$fh>; close $fh;
  my ($ext) = $file =~ /\.(\w+)$/;
  return HTTP::Response->new($code // 200, 'OK', ['Content-Type' => $mime{lc($ext // '')} // 'application/octet-stream', 'Cache-Control' => 'no-store'], $body);
}

while (my $c = $d->accept) {
  my $r = $c->get_request or do { $c->close; next };
  my $path = $r->uri->path;
  $path =~ s/%([0-9A-Fa-f]{2})/chr hex $1/ge;
  my $res;
  if ($r->method eq 'POST' && $path eq '/__save') {
    my ($rel) = ($r->uri->query // '') =~ /(?:^|&)path=([^&]+)/;
    $rel =~ s/%([0-9A-Fa-f]{2})/chr hex $1/ge if defined $rel;
    if (defined $rel && $rel =~ m{^static/[\w\-./]+$} && $rel !~ /\.\./) {
      make_path(dirname("$root/$rel"));
      open my $fh, '>:raw', "$root/$rel" or die $!; print $fh $r->content; close $fh;
      $res = HTTP::Response->new(200, 'OK', ['Content-Type'=>'text/plain'], "saved $rel " . length($r->content) . " bytes");
    } else { $res = HTTP::Response->new(400, 'Bad', ['Content-Type'=>'text/plain'], 'bad path') }
  } elsif ($path =~ m{\.\.}) {
    $res = HTTP::Response->new(400, 'Bad', ['Content-Type'=>'text/plain'], 'bad path');
  } else {
    my $base = "$root/public"; my $p = $path;
    if ($p =~ s{^/__(tools|legacy|static|data)/}{/}) { $base = "$root/$1" }
    if (-f "$base$p") { $res = file_res("$base$p") }
    elsif (-d "$base$p" && $p !~ m{/$}) { $res = HTTP::Response->new(301, 'Moved', ['Location' => "$path/"]) }
    elsif (-f "$base$p/index.html" || -f "${base}${p}index.html") { $res = file_res(-f "$base$p/index.html" ? "$base$p/index.html" : "${base}${p}index.html") }
    else { $res = file_res("$root/public/404.html", 404) || HTTP::Response->new(404, 'Not Found', ['Content-Type'=>'text/plain'], "404 $path") }
  }
  $res->header('Connection' => 'close');
  $c->send_response($res); $c->close;
  print $res->code, ' ', $r->method, " $path\n";
}
