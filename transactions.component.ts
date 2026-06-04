import { Component, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Observable, combineLatest } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, startWith } from 'rxjs/operators';
import { TransactionService } from './transaction.service';

export interface Transaction {
  id: string; 
  category: string;
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
export class TransactionsComponent implements OnInit {
  private transactionService = inject(TransactionService);
  
  searchControl = new FormControl('', { nonNullable: true });
  filteredTransactions$!: Observable<Transaction[]>;

  ngOnInit(): void {
    const search$ = this.searchControl.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      map(term => term.toLowerCase())
    );

    const transactions$: Observable<Transaction[]> = this.transactionService.getTransactions();

    this.filteredTransactions$ = combineLatest([transactions$, search$]).pipe(
      map(([transactions, searchTerm]) => 
        transactions.filter(t => t.category.toLowerCase().includes(searchTerm))
      )
    );
  }

  trackById(index: number, transaction: Transaction): string {
    return transaction.id;
  }
}
