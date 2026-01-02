import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { VisualSchemaEditorComponent } from './visual-schema-editor/visual-schema-editor.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, VisualSchemaEditorComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('fullStackAppGenerator');
}
