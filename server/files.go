package server

import (
	"io/fs"
	"io/ioutil"
	"os"

	"github.com/flarco/g"
)

type Operation string

const (
	OperationList   Operation = "list"
	OperationRead   Operation = "read"
	OperationWrite  Operation = "write"
	OperationDelete Operation = "delete"
)

// FileRequest is the typical request struct for file operations
type FileRequest struct {
	Operation Operation `json:"operation" query:"operation"`
	Path      string    `json:"path" query:"path"`
	Body      string    `json:"body" query:"body"`
}

type FileItem struct {
	Name  string `json:"name" query:"name"`
	Path  string `json:"path" query:"path"`
	IsDir bool   `json:"is_dir" query:"is_dir"`
}

// Read opens the file
func (f *FileRequest) Read() (body string, err error) {
	if f.Path == "" {
		err = g.Error("no path specified for open")
		return
	}

	path := f.Path
	if g.PathExists(path) {
		var bytes []byte
		bytes, err = ioutil.ReadFile(path)
		if err != nil {
			err = g.Error(err, "unable to read file: %s", path)
			return
		}
		body = string(bytes)
	} else {
		err = g.Error("path %s does not exists", path)
	}
	return
}

// Delete deletes the file
func (f *FileRequest) Delete() (err error) {
	if f.Path == "" {
		err = g.Error("no path specified for deleting")
		return
	}

	if g.PathExists(f.Path) {
		err = os.Remove(f.Path)
		if err != nil {
			err = g.Error(err, "unable to delete file: %s", f.Path)
			return
		}
	} else {
		err = g.Error("path %s does not exists", f.Path)
	}
	return
}

// Write saves the file
func (f *FileRequest) Write() (err error) {
	if f.Path == "" {
		err = g.Error("no path specified for saving")
		return
	}

	err = ioutil.WriteFile(f.Path, []byte(f.Body), 0755)
	if err != nil {
		err = g.Error(err, "unable to save file %s", f.Path)
	}
	return
}

// List lists files in a folder
func (f *FileRequest) List() (items []FileItem, err error) {
	if f.Path == "" {
		err = g.Error("no path specified for listing")
		return
	}

	if g.PathExists(f.Path) {
		var entries []fs.DirEntry
		entries, err = os.ReadDir(f.Path)
		if err != nil {
			err = g.Error(err, "unable to read directory %s", f.Path)
			return
		}

		for _, entry := range entries {
			info, _ := entry.Info()
			item := FileItem{
				Name:  entry.Name(),
				Path:  info.Name(),
				IsDir: entry.IsDir(),
			}
			items = append(items, item)
		}
	} else {
		err = g.Error("path %s does not exists", f.Path)
	}
	return
}
