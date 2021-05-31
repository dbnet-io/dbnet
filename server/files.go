package server

import (
	"io/fs"
	"io/ioutil"
	"os"
	"strings"

	"github.com/flarco/g"
)

type Operation string

const (
	OperationList   Operation = "list"
	OperationRead   Operation = "read"
	OperationWrite  Operation = "write"
	OperationDelete Operation = "delete"
)

// FileItem represents a file
type FileItem struct {
	Name  string `json:"name" query:"name"`
	Path  string `json:"path" query:"path"`
	IsDir bool   `json:"isDir" query:"isDir"`
	ModTs int64  `json:"modTs" query:"modTs"`
	Body  string `json:"body" query:"body"`
}

// FileRequest is the typical request struct for file operations
type FileRequest struct {
	Operation Operation `json:"operation" query:"operation"`
	File      FileItem  `json:"file" query:"file"`
	Overwrite bool      `json:"overwrite" query:"overwrite"`
}

// Read opens the file
func (f *FileRequest) Read() (file FileItem, err error) {
	if f.File.Path == "" {
		err = g.Error("no path specified for open")
		return
	}

	path := f.File.Path
	if g.PathExists(path) {
		var bytes []byte
		bytes, err = ioutil.ReadFile(path)
		if err != nil {
			err = g.Error(err, "unable to read file: %s", path)
			return
		}
		s, _ := os.Stat(f.File.Path)
		file.Name = s.Name()
		file.Path = path
		file.Body = string(bytes)
		file.ModTs = s.ModTime().Unix()
	} else {
		err = g.Error("path %s does not exists", path)
	}
	return
}

// Delete deletes the file
func (f *FileRequest) Delete() (err error) {
	if f.File.Path == "" {
		err = g.Error("no path specified for deleting")
		return
	}

	if g.PathExists(f.File.Path) {
		err = os.Remove(f.File.Path)
		if err != nil {
			err = g.Error(err, "unable to delete file: %s", f.File.Path)
			return
		}
	} else {
		err = g.Error("path %s does not exists", f.File.Path)
	}
	return
}

// Write saves the file
func (f *FileRequest) Write() (err error) {
	if f.File.Path == "" {
		err = g.Error("no path specified for saving")
		return
	}
	if g.PathExists(f.File.Path) {
		s, _ := os.Stat(f.File.Path)
		if f.File.ModTs < s.ModTime().Unix() && !f.Overwrite {
			return g.Error("File was modified by another process. Overwrite?")
		}
	}

	err = ioutil.WriteFile(f.File.Path, []byte(f.File.Body), 0755)
	if err != nil {
		err = g.Error(err, "unable to save file %s", f.File.Path)
	}
	return
}

// List lists files in a folder
func (f *FileRequest) List() (items []FileItem, err error) {
	if f.File.Path == "" {
		err = g.Error("no path specified for listing")
		return
	}

	f.File.Path = strings.TrimSuffix(f.File.Path, "/")
	if g.PathExists(f.File.Path) {
		var entries []fs.DirEntry
		entries, err = os.ReadDir(f.File.Path)
		if err != nil {
			err = g.Error(err, "unable to read directory %s", f.File.Path)
			return
		}

		for _, entry := range entries {
			path := g.F("%s/%s", f.File.Path, entry.Name())
			info, _ := entry.Info()
			item := FileItem{
				Name:  entry.Name(),
				ModTs: info.ModTime().Unix(),
				Path:  path,
				IsDir: entry.IsDir(),
			}
			items = append(items, item)
		}
	} else {
		err = g.Error("path %s does not exists", f.File.Path)
	}
	return
}
