#!/usr/bin/perl
# Foodidu SEO audit — checks every built page in public/.
#   perl tools/seo-audit.pl          -> report; exit code 1 if any ERROR
# Checks: title/description length and uniqueness, one <h1>, heading order, lang/dir,
# canonical, hreflang reciprocity, Open Graph image exists, JSON-LD parses, img alt/size,
# broken internal links, sitemap coverage and robots.txt.
use strict; use warnings; use utf8;
use JSON::PP ();
use File::Find ();
use File::Basename qw(dirname);
use Cwd qw(abs_path);
binmode STDOUT, ':encoding(UTF-8)';

my $ROOT = abs_path(dirname(abs_path(__FILE__)) . '/..');
my $PUB  = "$ROOT/public";
my $SITE = 'https://foodidu.com';
die "public/ not found, run perl tools/build.pl first\n" unless -d $PUB;

my (@err, @warn, %titles, %descs, %pages);
sub E { push @err,  "$_[0]: $_[1]" }
sub W { push @warn, "$_[0]: $_[1]" }
sub slurp { open my $fh, '<:encoding(UTF-8)', $_[0] or die $!; local $/; my $s = <$fh>; close $fh; $s }
sub unesc { my $s = shift; $s =~ s/&quot;/"/g; $s =~ s/&lt;/</g; $s =~ s/&gt;/>/g; $s =~ s/&amp;/&/g; $s }
sub url_of { my $f = shift; my $p = substr($f, length $PUB); $p =~ s{index\.html$}{}; $p }
sub resolves {
  my $href = shift;
  $href =~ s/[?#].*//;
  return 1 if $href eq '';
  my $p = "$PUB$href";
  return 1 if -f $p;
  return 1 if -f "$p/index.html" || ($href =~ m{/$} && -f "${p}index.html");
  return 0;
}

my @files;
File::Find::find({ no_chdir => 1, wanted => sub { push @files, $_ if /\.html$/ && !m{/google[0-9a-f]+\.html$} && !m{/dashboard/} } }, $PUB);   # skip Search Console verification files and the internal dashboard
@files = sort @files;

for my $f (@files) {
  my $html = slurp($f);
  my $path = url_of($f);
  my $id = $path eq '/404.html' ? '/404.html' : $path;
  my $noindex = $html =~ /<meta name="robots" content="noindex/;
  my %m;
  ($m{lang}) = $html =~ /<html lang="([^"]+)"/;
  ($m{dir})  = $html =~ /<html lang="[^"]+" dir="([^"]+)"/;
  ($m{title}) = $html =~ /<title>(.*?)<\/title>/s;
  ($m{desc}) = $html =~ /<meta name="description" content="([^"]*)"/;
  ($m{canon}) = $html =~ /<link rel="canonical" href="([^"]+)"/;
  $pages{$id} = { noindex => $noindex, lang => $m{lang} };

  E($id, 'missing lang') unless $m{lang};
  E($id, 'Arabic page is not dir="rtl"') if ($m{lang} // '') eq 'ar' && ($m{dir} // '') ne 'rtl';
  if (!defined $m{title}) { E($id, 'missing <title>') }
  else {
    my $t = unesc($m{title}); my $n = length $t;
    W($id, "title is $n chars (aim for 30-65): $t") if !$noindex && ($n > 65 || $n < 30);
    push @{ $titles{$t} }, $id unless $noindex;
  }
  if (!defined $m{desc}) { E($id, 'missing meta description') }
  else {
    my $d = unesc($m{desc}); my $n = length $d;
    W($id, "description is $n chars (aim for 70-165)") if !$noindex && ($n > 165 || $n < 70);
    push @{ $descs{$d} }, $id unless $noindex;
  }
  my $h1 = () = $html =~ /<h1[\s>]/g;
  E($id, "has $h1 <h1> tags (want exactly 1)") if $h1 != 1;
  my $main = $html =~ /<main[^>]*>(.*)<\/main>/s ? $1 : $html;
  my $last = 1;
  while ($main =~ /<h([1-6])[\s>]/g) { W($id, "heading jumps from h$last to h$1") if $1 > $last + 1; $last = $1; }

  unless ($noindex) {
    my $want = $SITE . $path;
    if (!$m{canon}) { E($id, 'missing canonical') }
    elsif ($m{canon} ne $want) { E($id, "canonical $m{canon} != $want") }
    my %alt; $alt{$1} = $2 while $html =~ /<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g;
    for my $hl (qw(en ar x-default)) { E($id, "missing hreflang $hl") unless $alt{$hl} }
    E($id, "hreflang for own language ($m{lang}) does not point to itself") if $m{lang} && $alt{$m{lang}} && $alt{$m{lang}} ne $want;
    for my $hl (keys %alt) {
      (my $p = $alt{$hl}) =~ s/^\Q$SITE\E//;
      if (!resolves($p)) { E($id, "hreflang $hl target missing: $p"); next }
      my $other = $p =~ m{/$} ? "$PUB${p}index.html" : "$PUB$p";
      next unless -f $other;
      my $oh = slurp($other);
      E($id, "hreflang $hl page $p does not link back") unless $oh =~ /hreflang="[^"]+" href="\Q$want\E"/;
    }
  }
  for my $p (qw(og:title og:description og:image og:url)) { E($id, "missing $p") unless $html =~ /property="$p"/ }
  if ($html =~ /property="og:image" content="([^"]+)"/) {
    (my $p = $1) =~ s/^\Q$SITE\E//;
    E($id, "og:image file missing: $p") unless -f "$PUB$p";
  }
  my @ld = $html =~ /<script type="application\/ld\+json">(.*?)<\/script>/gs;
  E($id, 'no JSON-LD') unless @ld || $noindex;
  for my $j (@ld) {
    (my $jj = $j) =~ s{<\\/}{</}g;
    my $d = eval { JSON::PP->new->decode($jj) };
    if (!$d) { E($id, "JSON-LD does not parse: $@"); next }
    my @types = map { $_->{'@type'} } @{ $d->{'@graph'} // [] };
    W($id, 'JSON-LD has no WebPage node') unless grep { /Page$/ } @types;
  }
  while ($html =~ /<img\b([^>]*)>/g) {
    my $a = $1;
    E($id, "img without alt: $a") unless $a =~ /\balt="/;
    W($id, "img without width/height: $a") unless $a =~ /\bwidth="/ && $a =~ /\bheight="/;
    if ($a =~ /\bsrc="(\/[^"]+)"/) { E($id, "img src missing: $1") unless resolves($1) }
  }
  my %seen;
  while ($html =~ /<(?:a|link)\b[^>]*\bhref="(\/[^"]*)"/g) {
    my $h = $1; next if $seen{$h}++;
    E($id, "broken internal link: $h") unless resolves($h);
  }
  while ($html =~ /<a\b([^>]*)>/g) {
    my $a = $1;
    W($id, "target=_blank without rel=noopener: $a") if $a =~ /target="_blank"/ && $a !~ /noopener/;
  }
  my $kb = int(length($html) / 1024);
  W($id, "HTML is ${kb}KB") if $kb > 120;
}

for my $t (keys %titles) { E(join(', ', @{ $titles{$t} }), "duplicate title: $t") if @{ $titles{$t} } > 1 }
for my $d (keys %descs)  { E(join(', ', @{ $descs{$d} }),  "duplicate description") if @{ $descs{$d} } > 1 }

# sitemap + robots
if (-f "$PUB/sitemap.xml") {
  my $sm = slurp("$PUB/sitemap.xml");
  my %in = map { (substr($_, length $SITE) => 1) } $sm =~ /<loc>([^<]+)<\/loc>/g;
  for my $p (grep { !$pages{$_}{noindex} } keys %pages) { E($p, 'indexable page missing from sitemap') unless $in{$p} }
  for my $p (keys %in) { E('sitemap', "lists $p which is missing or noindex") if !$pages{$p} || $pages{$p}{noindex} }
} else { E('sitemap', 'public/sitemap.xml missing') }
if (-f "$PUB/robots.txt") { E('robots.txt', 'no Sitemap line') unless slurp("$PUB/robots.txt") =~ /^Sitemap: \Q$SITE\E\/sitemap\.xml/m }
else { E('robots.txt', 'missing') }
for my $f (qw(favicon.ico apple-touch-icon.png site.webmanifest 404.html)) { E($f, 'missing') unless -f "$PUB/$f" }

my $n = scalar @files;
print "Foodidu SEO audit: $n pages checked\n";
print "\nERRORS (" . scalar(@err) . ")\n", map { "  x $_\n" } @err if @err;
print "\nWARNINGS (" . scalar(@warn) . ")\n", map { "  ! $_\n" } @warn if @warn;
print "\nAll checks passed.\n" unless @err || @warn;
exit(@err ? 1 : 0);
