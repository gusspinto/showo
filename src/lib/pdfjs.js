import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

/* Setup único do pdfjs (worker) — partilhado pela miniatura da Biblioteca
   e pelo visualizador de ficheiros. pdfjs é pesado, por isso quem usa isto
   importa-o dinamicamente. */
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl

export default pdfjsLib
