package middleware

import (
	"compress/gzip"
	"net/http"
	"strings"
)

// Gzip — response compression for the JSON API (F-4 wait-time fix).
//
// Why: catalogue/dashboard payloads (cohort listings, tutor search, programme
// data) are verbose JSON; on the mobile networks most NUVORA learners use,
// an uncompressed body is often 3–6× the transfer time of a gzipped one.
//
// Behaviour:
//   - Only compresses when the client sent `Accept-Encoding: gzip` and the
//     response Content-Type is compressible (JSON/JSONP/text/javascript/svg).
//   - First write decides; before that the handler may still set headers.
//   - `Vary: Accept-Encoding` is always set so caches never mix encodings.
//   - Streaming-safe: Flush() flushes the gzip stream; SSE endpoints (none
//     today) would simply stream compressed chunks.
//   - Webhook VERIFICATION reads the request body, not the response — gzip
//     here never affects signature checks.
const gzipMinSize = 512 // below this, compression costs more than it saves

var compressiblePrefixes = []string{
	"application/json",
	"application/javascript",
	"text/",
	"image/svg+xml",
}

type gzipResponseWriter struct {
	http.ResponseWriter
	decided  bool
	gz       *gzip.Writer
	sniff    []byte
	wroteGz  bool
	status   int
}

func (g *gzipResponseWriter) WriteHeader(code int) {
	g.status = code
	// Delay the decision: the body may be tiny; decide on first Write/Flush.
	if g.decided {
		g.ResponseWriter.WriteHeader(code)
	}
}

func (g *gzipResponseWriter) decide() {
	g.decided = true
	ct := g.Header().Get("Content-Type")
	base := strings.TrimSpace(strings.ToLower(ct))
	if i := strings.IndexByte(base, ';'); i >= 0 {
		base = strings.TrimSpace(base[:i])
	}
	compressible := false
	for _, p := range compressiblePrefixes {
		if strings.HasPrefix(base, p) {
			compressible = true
			break
		}
	}
	total := len(g.sniff)
	if !compressible || total < gzipMinSize {
		g.flushSniffRaw()
		return
	}
	g.Header().Del("Content-Length") // length changes once gzipped
	g.Header().Set("Content-Encoding", "gzip")
	if g.status != 0 {
		g.ResponseWriter.WriteHeader(g.status)
	}
	g.gz = gzip.NewWriter(g.ResponseWriter)
	g.wroteGz = true
	if _, err := g.gz.Write(g.sniff); err != nil {
		// Nothing sensible to do mid-stream; the gzip writer errors surface
		// on subsequent Write/Close.
		return
	}
	g.sniff = nil
}

func (g *gzipResponseWriter) flushSniffRaw() {
	if g.status != 0 {
		g.ResponseWriter.WriteHeader(g.status)
	}
	if len(g.sniff) > 0 {
		_, _ = g.ResponseWriter.Write(g.sniff)
		g.sniff = nil
	}
}

func (g *gzipResponseWriter) Write(p []byte) (int, error) {
	if !g.decided {
		g.sniff = append(g.sniff, p...)
		if len(g.sniff) < gzipMinSize {
			return len(p), nil
		}
		g.decide()
		if !g.wroteGz {
			return len(p), nil // sniff already flushed raw
		}
		return len(p), nil // sniff already written to gz
	}
	if !g.wroteGz {
		return g.ResponseWriter.Write(p)
	}
	return g.gz.Write(p)
}

func (g *gzipResponseWriter) Flush() {
	if !g.decided {
		g.decided = true
		g.decide()
	}
	if g.wroteGz {
		_ = g.gz.Flush()
	}
	if f, ok := g.ResponseWriter.(http.Flusher); ok {
		f.Flush()
	}
}

func (g *gzipResponseWriter) Close() {
	if !g.decided {
		g.decided = true
		g.decide()
	}
	if g.gz != nil {
		_ = g.gz.Close()
		g.gz = nil // idempotent: the deferred second Close is a no-op
	}
}

func acceptsGzip(r *http.Request) bool {
	for _, part := range strings.Split(r.Header.Get("Accept-Encoding"), ",") {
		if strings.EqualFold(strings.TrimSpace(strings.SplitN(part, ";", 2)[0]), "gzip") {
			return true
		}
	}
	return false
}

// Gzip wraps the handler with transparent response compression.
func Gzip(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodHead || !acceptsGzip(r) {
			next.ServeHTTP(w, r)
			return
		}
		w.Header().Add("Vary", "Accept-Encoding")
		gw := &gzipResponseWriter{ResponseWriter: w}
		defer gw.Close()
		next.ServeHTTP(gw, r)
		gw.Close()
	})
}
