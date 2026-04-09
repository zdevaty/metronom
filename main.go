package main

import (
	"net/http"
)

func main() {
	// Serve shared resources
	sharedFS := http.FileServer(http.Dir("./shared"))
	http.Handle("/shared/", http.StripPrefix("/shared", sharedFS))

	// Serve live version at root
	liveFS := http.FileServer(http.Dir("./frontend"))
	http.Handle("/", liveFS)

	// Serve sound check version at /zvukovka
	zvukovkaFS := http.FileServer(http.Dir("./frontend-zvukovka"))
	http.Handle("/zvukovka/", http.StripPrefix("/zvukovka", zvukovkaFS))

	http.ListenAndServe(":8000", nil)
}
