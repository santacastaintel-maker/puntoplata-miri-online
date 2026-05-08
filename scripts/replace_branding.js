import fs from 'fs';
import path from 'path';

function replaceInDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            replaceInDir(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.html') || fullPath.endsWith('.json')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('Miri Montero') || content.includes('Miri')) {
                content = content.replace(/Miri Montero/g, 'Andrés Montero');
                content = content.replace(/Miri/g, 'Andrés');
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated ${fullPath}`);
            }
        }
    }
}

replaceInDir('./src');
replaceInDir('./api');
replaceInDir('./public');
if (fs.existsSync('./index.html')) {
    let html = fs.readFileSync('./index.html', 'utf8');
    html = html.replace(/Miri Montero/g, 'Andrés Montero');
    html = html.replace(/Miri/g, 'Andrés');
    fs.writeFileSync('./index.html', html, 'utf8');
    console.log('Updated index.html');
}
