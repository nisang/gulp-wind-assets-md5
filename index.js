'use strict';

var through = require('through2'),
    gutil = require('gulp-util'),
    path = require('path'),
    fs = require('fs'),
    crypto = require('crypto-md5');

function calMd5(file, size) {
    var md5 = String(crypto(file, 'hex'));
    return size > 0 ? md5.slice(0, size) : md5;
}

module.exports = function (destPath, md5Size) {
    if (!destPath) {
        throw new PluginError('gulp-wind-assets-md5', 'Missing destPath option for gulp-wind-assets-md5');
    }

    md5Size = md5Size || 8;
    var srcReg = /\ssrc="([^"?]*)"/g,
        hrefReg = /<link.*\shref="([^"?]*)"/g,
        urlReg = /url\("?([^\?)"]*)"?\)/g,
        htmlFiles = [],
        assetPath,
        reg,
        data,
        md5Version,
        md5Path;

    return through.obj(function (file, enc, cb) {
        if (file.isStream()) {
            this.emit('error', new gutil.PluginError('gulp-wind-assets-md5', 'Streaming not supported'));
            return cb();
        }
        if (!file.contents) {
            return cb();
        }
        var fileSrc = String(file.contents);
        var regArr;
        var assets = {};
        if (path.extname(file.path) !== '.css') {
            // this is html,hold until the end.
            if (path.extname(file.path) === '.html') {
                htmlFiles.push(file);
                cb();
                return;
            } else {
                // copy others files such as 'jpg,png,svg,json...'
                cb(null, file);
                return;
            }
        }
        // generate css files.
        while (regArr = urlReg.exec(fileSrc)) {
            assetPath = regArr[1];
            if (assetPath) {
                if (!assets[assetPath]) {
                    assets[assetPath] = 1;
                    reg = new RegExp(assetPath, 'g');
                    md5Path = path.resolve(path.dirname(file.path), assetPath);
                    if (fs.existsSync(md5Path)) {
                        data = fs.readFileSync(md5Path);
                        md5Version = calMd5(data, md5Size);
                        fileSrc = fileSrc.replace(reg, assetPath + '?m=' + md5Version);
                    }
                }
            }
        }
        file.contents = new Buffer(fileSrc);
        cb(null, file);
    }, function (cb) {
        var that = this;
        // generate html files.
        htmlFiles.forEach(function (htmlFile) {
            var fileSrc = String(htmlFile.contents),
                regArr,
                assets = {};
            // js and img link tag.
            while (regArr = srcReg.exec(fileSrc)) {
                assetPath = regArr[1];
                if (assetPath) {
                    if (!assets[assetPath]) {
                        assets[assetPath] = 1;
                        reg = new RegExp(assetPath, 'g');
                        md5Path = path.resolve(path.dirname(htmlFile.path), assetPath);
                        if (fs.existsSync(md5Path)) {
                            data = fs.readFileSync(md5Path);
                            md5Version = calMd5(data, md5Size);
                            fileSrc = fileSrc.replace(reg, assetPath + '?m=' + md5Version);
                        }
                    }
                }
            }
            // css link tag
            while (regArr = hrefReg.exec(fileSrc)) {
                assetPath = regArr[1];
                if (assetPath) {
                    if (!assets[assetPath]) {
                        assets[assetPath] = 1;
                        reg = new RegExp(assetPath, 'g');
                        var targetPath = path.relative(htmlFile.base, htmlFile.path);
                        md5Path = path.resolve(path.dirname(path.resolve(htmlFile.cwd, destPath, targetPath)), assetPath);
                        if (fs.existsSync(md5Path)) {
                            data = fs.readFileSync(md5Path);
                            md5Version = calMd5(data, md5Size);
                            fileSrc = fileSrc.replace(reg, assetPath + '?m=' + md5Version);
                        }
                    }
                }
            }
            htmlFile.contents = new Buffer(fileSrc);
            that.push(htmlFile);
        });
        cb();
    });
};