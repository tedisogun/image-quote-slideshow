package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// Slide represents a single slide with an image and quote
type Slide struct {
	ID       int    `json:"id"`
	ImageUrl string `json:"imageUrl"`
	Quote    string `json:"quote"`
	Author   string `json:"author,omitempty"`
}

var slides []Slide

func main() {
	// Load slides data
	err := loadSlides()
	if err != nil {
		log.Fatalf("Failed to load slides: %v", err)
	}

	// Set up file server for static files with appropriate caching
	staticFiles := http.FileServer(http.Dir("./static"))
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		// Don't cache HTML, but do cache CSS and JS
		if strings.HasSuffix(r.URL.Path, ".css") || strings.HasSuffix(r.URL.Path, ".js") {
			w.Header().Set("Cache-Control", "public, max-age=86400") // Cache for 24 hours
		} else {
			w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
		}
		staticFiles.ServeHTTP(w, r)
	})

	// API endpoint for slides
	http.HandleFunc("/api/slides", handleSlides)

	// Serve images from the images directory with caching headers
	imageHandler := http.StripPrefix("/images/", http.FileServer(http.Dir("./images")))
	http.HandleFunc("/images/", func(w http.ResponseWriter, r *http.Request) {
		// Set cache headers to prevent unnecessary redownloads
		w.Header().Set("Cache-Control", "public, max-age=86400") // Cache for 24 hours
		w.Header().Set("Expires", time.Now().Add(24*time.Hour).Format(http.TimeFormat))
		imageHandler.ServeHTTP(w, r)
	})

	// Start server
	port := getEnv("PORT", "8080")
	fmt.Printf("Server starting on port %s...\n", port)
	err = http.ListenAndServe(":"+port, nil)
	if err != nil {
		log.Fatal(err)
	}
}

// loadSlides loads slides from a JSON file or initializes with default slides
func loadSlides() error {
	// Try to load from slides.json
	data, err := os.ReadFile("slides.json")
	if err == nil {
		return json.Unmarshal(data, &slides)
	}

	// If file doesn't exist, load images from the images directory
	fmt.Println("slides.json not found, initializing with images from directory...")
	return loadSlidesFromImagesDir()
}

// loadSlidesFromImagesDir scans the images directory and creates slides
func loadSlidesFromImagesDir() error {
	imgDir := "./images"

	// Create images directory if it doesn't exist
	if _, err := os.Stat(imgDir); os.IsNotExist(err) {
		err := os.MkdirAll(imgDir, 0755)
		if err != nil {
			return fmt.Errorf("failed to create images directory: %v", err)
		}
		// Add a sample image if directory was just created
		return createSampleData()
	}

	files, err := os.ReadDir(imgDir)
	if err != nil {
		return fmt.Errorf("failed to read images directory: %v", err)
	}

	// Clear existing slides
	slides = []Slide{}

	// Add a slide for each image
	id := 1
	for _, file := range files {
		if file.IsDir() {
			continue
		}

		// Check if it's an image file
		fileName := file.Name()
		ext := strings.ToLower(filepath.Ext(fileName))
		if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".gif" {
			continue
		}

		// Create a slide with default quote
		slide := Slide{
			ID:       id,
			ImageUrl: fmt.Sprintf("/images/%s", fileName),
			Quote:    fmt.Sprintf("This is a default quote for image %s", fileName),
			Author:   "Unknown",
		}

		slides = append(slides, slide)
		id++
	}

	// If no images were found, create sample data
	if len(slides) == 0 {
		return createSampleData()
	}

	// Save the generated slides to slides.json
	return saveSlides()
}

// createSampleData creates sample slides with placeholder images
func createSampleData() error {
	imgDir := "./images"

	// Ensure the directory exists
	if err := os.MkdirAll(imgDir, 0755); err != nil {
		return err
	}

	// Sample quotes
	sampleQuotes := []struct {
		quote  string
		author string
	}{
		{"The only way to do great work is to love what you do.", "Steve Jobs"},
		{"Life is what happens when you're busy making other plans.", "John Lennon"},
		{"The future belongs to those who believe in the beauty of their dreams.", "Eleanor Roosevelt"},
		{"Success is not final, failure is not fatal: It is the courage to continue that counts.", "Winston Churchill"},
	}

	// Clear existing slides
	slides = []Slide{}

	// Create placeholder images and slides
	for i, q := range sampleQuotes {
		// Create a placeholder text file as we can't generate images in this example
		// In a real application, you'd provide actual images
		placeholderFileName := fmt.Sprintf("placeholder_%d.txt", i+1)
		placeholderPath := filepath.Join(imgDir, placeholderFileName)

		// Write a note to the placeholder file
		placeholderContent := fmt.Sprintf("This is a placeholder for image %d. Replace with an actual image file.", i+1)
		err := os.WriteFile(placeholderPath, []byte(placeholderContent), 0644)
		if err != nil {
			return fmt.Errorf("failed to create placeholder file: %v", err)
		}

		// Add the slide
		slides = append(slides, Slide{
			ID:       i + 1,
			ImageUrl: fmt.Sprintf("/images/placeholder_%d.txt", i+1), // Note: This won't display as an image
			Quote:    q.quote,
			Author:   q.author,
		})
	}

	// Save the sample slides
	return saveSlides()
}

// saveSlides saves the slides to slides.json
func saveSlides() error {
	data, err := json.MarshalIndent(slides, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal slides: %v", err)
	}

	err = os.WriteFile("slides.json", data, 0644)
	if err != nil {
		return fmt.Errorf("failed to write slides.json: %v", err)
	}

	return nil
}

// handleSlides responds with the slides data
func handleSlides(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-cache") // Ensure fresh data

	err := json.NewEncoder(w).Encode(slides)
	if err != nil {
		http.Error(w, "Failed to encode slides", http.StatusInternalServerError)
		return
	}
}

// getEnv retrieves an environment variable or returns a default value
func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}
