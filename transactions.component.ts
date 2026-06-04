import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Observable, combineLatest, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, startWith, shareReplay, catchError } from 'rxjs/operators';
import { TransactionService } from './transaction.service';

export interface Transaction {
  id: string; 
  category?: string; 
  amount: number;
}

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush, 
  template: `
    <input [formControl]="searchControl" placeholder="Search transactions..." />
    
    <div *ngFor="let t of filteredTransactions$ | async; trackBy: trackById">
      {{ t.category }} - {{ t.amount | currency }}
    </div>
  `
})
export class TransactionsComponent {
  private transactionService = inject(TransactionService);
  
  searchControl = new FormControl('', { nonNullable: true });

  private search$ = this.searchControl.valueChanges.pipe(
    startWith(''),
    debounceTime(300),
    distinctUntilChanged(),
    map(term => term.toLowerCase())
  );

  private transactions$ = this.transactionService.getTransactions().pipe(
    shareReplay(1),
    catchError(() => {
      console.error('Failed to load transactions');
      return of([]); 
    })
  );

  filteredTransactions$ = combineLatest([this.transactions$, this.search$]).pipe(
    map(([transactions, searchTerm]) => 
      transactions.filter(t => (t.category ?? '').toLowerCase().includes(searchTerm))
    )
  );

  trackById(_: number, transaction: Transaction): string {
    return transaction.id;
  }
}
